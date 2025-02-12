import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";

dotenv.config();


const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

export default drive;
