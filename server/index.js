const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const { addDays, format, isAfter, startOfDay, getHours, getDay, isBefore, parseISO } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');

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

const TIME_ZONE = 'America/Denver';
const getAllowedDateWindow = () => {
  const today = toZonedTime(new Date(), TIME_ZONE);
  const currentHour = getHours(today);

  let start = today;
  let end = startOfDay(addDays(today, 3));

  if (currentHour >= 19) {
    start = addDays(today, 1);
    end = startOfDay(addDays(today, 4));
  }

  return { start, end };
};

const isSunday = (date) => getDay(date) === 0;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendConfirmationEmail = (to, deliveryDate, name) => {
  const firstName = name.split(' ')[0];
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: 'Delivery Date Confirmation',
    html: `
      <p>Dear ${firstName},</p>
      <p>Thank you for scheduling your delivery with SellBuddy. We have confirmed your selected delivery date of <strong>${format(deliveryDate, 'MMMM dd, yyyy')}</strong>.</p>
      <p><strong>You will receive another email with your estimated time block the night before your delivery.</strong> Additionally, our third-party delivery service will call you 30 minutes before we arrive on the day of delivery to ensure you are ready.</p>
      <p>If you need to reschedule your delivery date, please use the following link: [Reschedule Link].</p>
      <p>For any assistance, you can reach us at (720) 689-4656. Our customer support hours are:</p>
      <ul>
        <li>Weekdays: 11 AM - 7 PM</li>
        <li>Weekends: 11 AM - 5 PM</li>
      </ul>
      <p>Thank you for choosing SellBuddy. We appreciate your business.</p>
      <p>Best regards,</p>
      <p>The SellBuddy Team</p>
    `
  };

  // Uncomment the next line to send the email
  return transporter.sendMail(mailOptions);
  //console.log('Mock email sending: ', mailOptions);
  //return Promise.resolve();
};

app.get('/api/unavailable-dates', async (req, res) => {
  const { start, end } = getAllowedDateWindow();
  console.log(`Allowed date window: Start - ${start}, End - ${end}`);
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet1!A2:J', // Adjusted to match the new column count
    });
    const rows = response.data.values;
    if (rows.length) {
      const dateCountMap = {};
      rows.forEach(row => {
        const deliveryDate = row[6]; // Assuming delivery date is now in the 7th column
        const deliveryDateObj = parseISO(deliveryDate);
        console.log(`Checking delivery date: ${deliveryDateObj}`);
        if (isAfter(deliveryDateObj, end) || isBefore(deliveryDateObj, start) || isSunday(deliveryDateObj)) return; // Skip dates beyond the window or Sundays
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
  const { submissionDateTime, orderNumber, name, email, phoneNumber, deliveryAddress, deliveryDate, contactlessDelivery, deliveryInstructions } = req.body;

  console.log('Received data:', req.body); // Debugging

  const { start, end } = getAllowedDateWindow();
  const selectedDate = parseISO(deliveryDate);

  console.log(`Selected date: ${selectedDate}`);
  console.log(`Start of allowed window: ${start}`);
  console.log(`End of allowed window: ${end}`);

  if (isAfter(selectedDate, end) || isBefore(selectedDate, start) || isSunday(selectedDate)) {
    console.log('Date validation failed.');
    return res.status(400).json({ message: 'Delivery date must be within the next allowed days and cannot be a Sunday' });
  }

  try {
    const existingResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Sheet1!A2:J',
    });
    const rows = existingResponse.data.values || [];

    let updated = false;
    const updatedRows = rows.map(row => {
      if (row[1] === orderNumber && row[3] === email) {
        updated = true;
        return [submissionDateTime, orderNumber, name, email, phoneNumber, deliveryAddress, deliveryDate, contactlessDelivery, deliveryInstructions];
      }
      return row;
    });

    if (updated) {
      // Clear the sheet
      await sheets.spreadsheets.values.clear({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'Sheet1!A2:J',
      });

      // Write the updated rows
      await sheets.spreadsheets.values.update({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: updatedRows,
        },
      });
    } else {
      // Append new entry
      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'Sheet1!A1:J1', // Adjusted to match the new column count
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [
            [submissionDateTime, orderNumber, name, email, phoneNumber, deliveryAddress, deliveryDate, contactlessDelivery, deliveryInstructions]
          ],
        },
      });
    }

    // Send the confirmation email
    await sendConfirmationEmail(email, selectedDate, name);

    console.log('Response from Sheets API:', existingResponse.data);
    res.json({ message: 'Order details submitted successfully' });
  } catch (error) {
    console.error('Error submitting order details:', error);
    res.status(500).json({ message: 'Error submitting order details' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
