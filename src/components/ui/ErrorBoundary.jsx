import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-slate-50 rounded-[2rem] border border-slate-200 m-4">
                    <div className="bg-red-100 p-4 rounded-full mb-4">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-xl font-black text-slate-800 mb-2">Ops! Algo deu errado.</h2>
                    <p className="text-slate-500 mb-6 max-w-md">
                        Ocorreu um erro ao carregar esta seção. Tente recarregar a página.
                    </p>

                    <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-left text-xs font-mono mb-6 w-full max-w-lg overflow-auto max-h-40">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </div>

                    <button
                        onClick={this.handleReload}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Recarregar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
