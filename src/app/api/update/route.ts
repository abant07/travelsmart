import fs from 'fs';
import path from 'path';
import parse from 'csv-parser';
import {createObjectCsvWriter} from 'csv-writer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const newCode = searchParams.get("newCode")
  const newFname = searchParams.get("newFname")
  const newLname = searchParams.get("newLname")
  const newPhone =searchParams.get("newPhone")

  let data: any[] = [];
  const filePath = path.join(process.cwd(), '/components/flightreservation.csv');
  fs.createReadStream(filePath)
    .pipe(parse())
    .on('data', (row: any) => {
      if (row.confimation === newCode) {
        row.firstname = newFname;
        row.lastname = newLname;
        row.phonenumber = newPhone;
      }
      data.push(row);
    })
    .on('end', () => {
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: Object.keys(data[0]).map((key) => ({ id: key, title: key })),
      });
      
      csvWriter
        .writeRecords(data)
    });

    return NextResponse.json({ success: "Flight Reservation Updated" }, { status: 200 })
}
