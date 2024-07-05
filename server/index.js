const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const { addDays, format, isAfter, startOfDay, getHours, getDay, isBefore } = require('date-fns');

dotenv.config();

const app = express();
const port = 5001;

app.use(cors());
app.use(bodyParser.json());

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

const getAllowedDateWindow = () => {
  const today = new Date();
  const currentHour = getHours(today);
  const daysToAdd = currentHour >= 19 ? 4 : 3;
  const start = today;
  const end = addDays(today, daysToAdd);
  return { start, end };
};

const isSunday = (date) => getDay(date) === 0;

app.get('/api/unavailable-dates', async (req, res) => {
  const { start, end } = getAllowedDateWindow();
  console.log(`Allowed date window: Start - ${start}, End - ${end}`);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet1!A2:F', // Assuming data starts from row 2
    });
    const rows = response.data.values;
    if (rows.length) {
      const dateCountMap = {};
      rows.forEach(row => {
        const deliveryDate = row[5]; // Assuming delivery date is in the 6th column
        const deliveryDateObj = new Date(deliveryDate);
        console.log(`Checking delivery date: ${deliveryDateObj}`);
        if (isAfter(startOfDay(deliveryDateObj), startOfDay(end)) || isBefore(startOfDay(deliveryDateObj), startOfDay(start)) || isSunday(deliveryDateObj)) return; // Skip dates beyond the window or Sundays
        if (dateCountMap[deliveryDate]) {
          dateCountMap[deliveryDate]++;
        } else {
          dateCountMap[deliveryDate] = 1;
        }
      });
      const unavailableDates = Object.keys(dateCountMap).filter(date => dateCountMap[date] >= 8);
      console.log(`Unavailable dates: ${unavailableDates}`);
      res.json({ unavailableDates });
    } else {
      res.json({ unavailableDates: [] });
    }
  } catch (error) {
    console.error('Error fetching unavailable dates:', error);
    res.status(500).json({ message: 'Error fetching unavailable dates' });
  }
});

app.post('/api/submit', async (req, res) => {
  const { submissionDateTime, orderNumber, name, phoneNumber, deliveryAddress, deliveryDate } = req.body;

  const { start, end } = getAllowedDateWindow();
  const selectedDate = new Date(deliveryDate);

  console.log(`Selected date: ${selectedDate}`);
  console.log(`Start of allowed window: ${start}`);
  console.log(`End of allowed window: ${end}`);

  if (isAfter(startOfDay(selectedDate), startOfDay(end)) || isBefore(startOfDay(selectedDate), startOfDay(start)) || isSunday(selectedDate)) {
    console.log('Date validation failed.');
    return res.status(400).json({ message: 'Delivery date must be within the next allowed days and cannot be a Sunday' });
  }

  console.log('Received request:', req.body);

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet1!A1:G1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          [submissionDateTime, orderNumber, name, phoneNumber, deliveryAddress, deliveryDate]
        ],
      },
    });
    console.log('Response from Sheets API:', response.data); 
    res.json({ message: 'Order details submitted successfully' });
  } catch (error) {
    console.error('Error submitting order details:', error);
    res.status(500).json({ message: 'Error submitting order details' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
