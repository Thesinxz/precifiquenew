import React from 'react';
import { StockManager } from './stock/StockManager';

export function StockPage(props) {
    return <StockManager {...props} />;
}

export default StockPage;
