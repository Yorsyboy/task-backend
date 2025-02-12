import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const KEYFILEPATH = path.join(process.cwd(), "task-tracker.json");

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

export default drive;
