import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';

export const ProposalService = {
    generatePDF: async (proposalData) => {
        const { company, client, items, paymentMethod, installments } = proposalData;
        const doc = new jsPDF();

        // --- Header ---
        let startX = 14;
        const logo = company.logo || company.logoUrl;
        if (logo) {
            try {
                // Attempt to add logo. x=14, y=10, w=25, h=25
                doc.addImage(logo, 'PNG', 14, 10, 25, 25);
                startX = 45; // Shift text to the right
            } catch (e) {
                console.warn("Could not add logo to PDF:", e);
                startX = 14; // Fallback
            }
        }

        doc.setFontSize(22);
        doc.setTextColor(79, 70, 229);
        doc.setFont("helvetica", "bold");
        doc.text(company.name || "Minha Loja", startX, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        let yPos = 26;
        if (company.cnpj) {
            doc.text(`CNPJ: ${company.cnpj}`, startX, yPos);
            yPos += 5;
        }
        if (company.phone) {
            doc.text(`Tel: ${company.phone}`, startX, yPos);
            yPos += 5;
        }
        if (company.address) {
            doc.text(company.address, startX, yPos);
        }

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.setFont("helvetica", "bold");
        doc.text("Orçamento", 14, 50);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        const today = new Date().toLocaleDateString('pt-BR');
        doc.text(`Data: ${today}`, 14, 56);
        doc.text(`Validade: 7 dias`, 14, 61);

        if (client && client.name) {
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(`Cliente: ${client.name}`, 120, 50);
        }

        const tableBody = items.map(item => [
            item.name,
            item.details || '-',
            formatCurrency(item.pixPrice),
            formatCurrency(item.installmentPrice) + ` (12x)`
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['Produto', 'Detalhes', 'À Vista (Pix)', 'Parcelado (12x)']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 10,
                cellPadding: 6
            },
            columnStyles: {
                0: { fontStyle: 'bold' },
                2: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
                3: { halign: 'right' }
            }
        });

        const totalPix = items.reduce((acc, item) => acc + item.pixPrice, 0);
        const totalInstallment = items.reduce((acc, item) => acc + (item.installmentPrice || item.pixPrice), 0);
        const finalY = doc.lastAutoTable.finalY + 10;

        // Total Section
        if (paymentMethod === 'credit') {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Forma de Pagamento: Cartão de Crédito (${installments}x)`, 140, finalY);

            doc.setFontSize(14);
            doc.setTextColor(79, 70, 229);
            doc.setFont("helvetica", "bold");
            doc.text(formatCurrency(totalInstallment), 195, finalY + 7, { align: 'right' });
        } else {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Total à Vista (Pix):", 140, finalY);

            doc.setFontSize(14);
            doc.setTextColor(22, 163, 74);
            doc.setFont("helvetica", "bold");
            doc.text(formatCurrency(totalPix), 195, finalY + 7, { align: 'right' });
        }


        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Gerado via Precifica.AI", 105, 290, { align: 'center' });

        const fileName = `Orcamento_${client.name || 'Cliente'}_${Date.now()}.pdf`;
        doc.save(fileName);
    },

    saveProposal: async (userId, proposalData) => {
        if (!userId) throw new Error("User ID required");
        try {
            const docRef = await addDoc(collection(db, 'proposals'), {
                userId,
                clientName: proposalData.client.name,
                clientId: proposalData.client.id || null,
                items: proposalData.items,
                totalPix: proposalData.items.reduce((acc, i) => acc + (i.pixPrice || 0), 0),
                paymentMethod: proposalData.paymentMethod || 'pix',
                installments: proposalData.installments || 1,
                createdAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error saving proposal:", error);
            throw error;
        }
    },

    getProposalsByClient: async (clientId) => {
        try {
            const q = query(
                collection(db, 'proposals'),
                where("clientId", "==", clientId),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() }));
        } catch (error) {
            console.error("Error fetching client proposals:", error);
            throw error;
        }
    }
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};
