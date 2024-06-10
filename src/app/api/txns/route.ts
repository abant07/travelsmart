import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Transaction {
    transactionType: string;
    seller: string;
    txnId: string;
    transactionTime: string;
    sellerName: string;
    sellerPhone: string;
    buyerName: string;
    buyerPhone: string;
    flightConfirmationNumber: string;
}

interface WalletData {
    transactions: Transaction[];
}

interface JsonData {
    [key: string]: WalletData;
}


export async function POST(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const wallet = searchParams.get("walletAddress")
    const txntype = searchParams.get("transactionType")
    const seller = searchParams.get("seller")
    const txnid =searchParams.get("txnId")
    const txntime = searchParams.get("transactionTime")
    const confirmation =searchParams.get("flightConfirmationNumber")
    const buyerphone =searchParams.get("buyerPhone")
    const buyername =searchParams.get("buyerName")
    const sellerphone =searchParams.get("sellerPhone")
    const sellername =searchParams.get("sellerName")

    const jsonFilePath = path.join(process.cwd(), '/components/transactions.json');

    const newTransaction: Transaction = {
        transactionType: txntype as string,
        seller: seller as string,
        txnId: txnid as string,
        transactionTime: txntime as string,
        sellerName: sellername as string,
        sellerPhone: sellerphone as string,
        buyerName: buyername as string,
        buyerPhone: buyerphone as string,
        flightConfirmationNumber: confirmation as string,
    };

    let jsonData: JsonData = {};

    try {
        if (fs.existsSync(jsonFilePath)) {
          const fileContent = fs.readFileSync(jsonFilePath, 'utf-8');
          jsonData = JSON.parse(fileContent);
        }
    } catch (error) {
        return NextResponse.json({ message: 'Failed to read JSON file', error });
    }

    if (jsonData[wallet as string]) {
        jsonData[wallet as string].transactions.push(newTransaction);
    } else {
        // If it doesn't exist, create a new entry
        jsonData[wallet as string] = {
          transactions: [newTransaction],
        };
    }

    // Write the updated JSON data back to the file
    try {
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));
    } catch (error) {
        return NextResponse.json({ message: 'Failed to write JSON file', error });
    }

    return NextResponse.json({ message: 'Success' });
}