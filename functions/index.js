const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { mapEmitente, mapProducts, mapPayments, mapDestinatario } = require("./utils/nfeMapper");

admin.initializeApp();
const db = admin.firestore();
const formatPrice = (num) => (num || 0).toFixed(2);

/**
 * Cloud Function to Emit NFC-e / NF-e
 * This runs securely on Google Cloud, keeping the certificate safe.
 */
exports.emitInvoice = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "User must be logged in to emit invoices."
        );
    }

    const { saleId, orgId } = data;

    try {
        // 2. Load Data from Firestore
        const orgDoc = await db.collection("fiscal_settings").doc(orgId).get();
        const saleDoc = await db.collection("sales").doc(saleId).get();

        if (!orgDoc.exists || !saleDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Organization or Sale not found.");
        }

        const orgData = orgDoc.data();
        const saleData = saleDoc.data();

        // Normalize Customer/Client
        if (!saleData.customer && saleData.client) {
            saleData.customer = saleData.client;
        }

        // 3. Validation
        if (!orgData.cnpj) {
            throw new functions.https.HttpsError("failed-precondition", "CNPJ not configured.");
        }

        if (!orgData.certificatePath) {
            throw new functions.https.HttpsError("failed-precondition", "Digital Certificate not uploaded. Please upload a .pfx certificate in Settings > Fiscal.");
        }

        if (!orgData.certificatePassword) {
            throw new functions.https.HttpsError("failed-precondition", "Certificate password not configured.");
        }

        // 3.1. Download Certificate from Storage (for real emission)
        // const bucket = admin.storage().bucket();
        // const certFile = bucket.file(orgData.certificatePath);
        // const [certBuffer] = await certFile.download();
        // This buffer would be passed to node-sped-nfe

        // 4. Determine Invoice Type (NFCe vs NFe)
        const isNFCe = !saleData.customer || !saleData.customer.cpf;
        const invoiceModel = isNFCe ? '65' : '55';

        // 5. Map Data to NFe Format
        const nfeData = {
            infNFe: {
                ide: {
                    cUF: orgData.stateCode || '35', // State code (35 = SP)
                    cNF: Math.floor(Math.random() * 99999999).toString().padStart(8, '0'),
                    natOp: 'VENDA DE MERCADORIAS',
                    mod: invoiceModel,
                    serie: orgData.serie || '1',
                    nNF: (saleData.invoiceNumber || Date.now() % 100000).toString(),
                    dhEmi: new Date().toISOString(),
                    tpNF: '1', // 1=Saída
                    idDest: '1', // 1=Interna
                    cMunFG: orgData.cityCode || '3550308', // IBGE City Code
                    tpImp: isNFCe ? '4' : '1', // 4=DANFE NFCe, 1=DANFE Normal
                    tpEmis: '1', // 1=Normal
                    cDV: '0', // Will be calculated by library
                    tpAmb: orgData.environment === 'production' ? '1' : '2',
                    finNFe: '1', // 1=Normal
                    indFinal: '1', // 1=Consumidor Final
                    indPres: '1', // 1=Presencial
                    procEmi: '0', // 0=Aplicação do Contribuinte
                    verProc: '1.0.0'
                },
                emit: mapEmitente(orgData),
                det: mapProducts(saleData.items || [], orgData.environment),
                total: {
                    ICMSTot: {
                        vBC: '0.00',
                        vICMS: '0.00',
                        vICMSDeson: '0.00',
                        vFCP: '0.00',
                        vBCST: '0.00',
                        vST: '0.00',
                        vFCPST: '0.00',
                        vFCPSTRet: '0.00',
                        vProd: formatPrice(saleData.total || 0),
                        vFrete: '0.00',
                        vSeg: '0.00',
                        vDesc: formatPrice(saleData.discount || 0),
                        vII: '0.00',
                        vIPI: '0.00',
                        vIPIDevol: '0.00',
                        vPIS: '0.00',
                        vCOFINS: '0.00',
                        vOutro: '0.00',
                        vNF: formatPrice((saleData.total || 0) - (saleData.discount || 0))
                    }
                },
                transp: {
                    modFrete: '9' // 9=Sem Frete
                },
                pag: mapPayments(saleData.payments),
                infAdic: {
                    infCpl: orgData.additionalInfo || 'Documento emitido por ME ou EPP optante pelo Simples Nacional.'
                }
            }
        };

        // Add customer data if NFe (not NFCe)
        if (!isNFCe && saleData.customer) {
            nfeData.infNFe.dest = mapDestinatario(saleData.customer);
        }

        // Add CSC for NFCe
        if (isNFCe && orgData.cscId && orgData.csc) {
            nfeData.infNFe.ide.CSC = orgData.csc;
            nfeData.infNFe.ide.idCSC = orgData.cscId;
        }

        console.log("Generated NFe JSON:", JSON.stringify(nfeData, null, 2));

        // 6. TODO: Actual Emission with node-sped-nfe
        // This is where you would integrate the real library:
        // const SpedNFe = require('node-sped-nfe');
        // const nfe = new SpedNFe({
        //     certificate: orgData.certificateBuffer, // .pfx file buffer
        //     password: orgData.certificatePassword,
        //     environment: orgData.environment === 'production' ? 'production' : 'homologation'
        // });
        // const result = await nfe.authorize(nfeData);

        // For now, return mock success
        const mockResult = {
            success: true,
            status: 'authorized',
            message: "Invoice mapped successfully (Mock - Ready for real emission)",
            nfeKey: `35${new Date().getFullYear()}${orgData.cnpj}${invoiceModel}${orgData.serie || '1'}${nfeData.infNFe.ide.nNF.padStart(9, '0')}`,
            protocol: "1234567890",
            authorizationDate: new Date().toISOString(),
            xmlUrl: null, // Will be generated after real emission
            pdfUrl: null, // Will be generated after real emission
            debugData: nfeData
        };

        // 7. Save emission record
        await db.collection("nfe_emissions").add({
            organizationId: orgId,
            saleId: saleId,
            invoiceType: isNFCe ? 'NFCe' : 'NFe',
            invoiceNumber: nfeData.infNFe.ide.nNF,
            serie: nfeData.infNFe.ide.serie,
            status: 'mock_authorized',
            nfeKey: mockResult.nfeKey,
            protocol: mockResult.protocol,
            emittedAt: admin.firestore.FieldValue.serverTimestamp(),
            emittedBy: context.auth.uid,
            environment: orgData.environment || 'homologation'
        });

        return mockResult;

    } catch (error) {
        console.error("Emission Error:", error);

        // Save error record
        try {
            await db.collection("nfe_emissions").add({
                organizationId: orgId,
                saleId: saleId,
                status: 'error',
                errorMessage: error.message,
                errorCode: error.code,
                attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
                attemptedBy: context.auth.uid
            });
        } catch (logError) {
            console.error("Failed to log emission error:", logError);
        }

        throw new functions.https.HttpsError("internal", error.message);
    }
});

