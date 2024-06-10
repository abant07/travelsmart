import { NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

export async function GET() {

    const filePath = path.join(process.cwd(), "/components/flightreservation.csv"); // Adjust the path to your CSV file
    const results = [];

    try {
        // Read and parse the CSV file
        const fileStream = fs.createReadStream(filePath);
        const parser = fileStream.pipe(csv());

        for await (const row of parser) {
            results.push(Object.values(row)); // Convert each row into an array of values
        }

        return NextResponse.json(results);
    } catch (error) {
        return NextResponse.json({ error: "Error reading CSV file" }, { status: 500 });
    }
}