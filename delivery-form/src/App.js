import React, { useState, useEffect } from 'react';
import './App.css';
import { format, addDays, getHours, getDay } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function App() {
  const [orderNumber, setOrderNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [unavailableDates, setUnavailableDates] = useState([]);

  useEffect(() => {
    const fetchUnavailableDates = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/unavailable-dates');
        const data = await response.json();
        setUnavailableDates(data.unavailableDates);
      } catch (error) {
        console.error('Error fetching unavailable dates:', error);
      }
    };
    fetchUnavailableDates();
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!orderNumber || !firstName || !lastName || !phoneNumber || !deliveryAddress || !deliveryDate) {
      setError('All fields are required.');
    } else {
      setError('');
      setSuccessMessage('');
      const name = `${firstName} ${lastName}`;
      const submissionDateTime = format(new Date(), "yyyy-MM-dd hh:mm a");
      // Send data to the server
      fetch('http://localhost:5001/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber,
          name,
          phoneNumber,
          deliveryAddress,
          deliveryDate: format(deliveryDate, "yyyy-MM-dd"),
          submissionDateTime
        }),
      })
      .then(response => response.json())
      .then(data => {
        console.log('Success:', data);
        setSuccessMessage('Order details submitted successfully!');
      })
      .catch((error) => {
        console.error('Error:', error);
        setError('Error submitting order details.');
      });
    }
  };

  const isDateSelectable = (date) => {
    const today = new Date();
    const currentHour = getHours(today);
    const daysToAdd = currentHour >= 19 ? 4 : 3;
    const threeDaysAhead = addDays(today, daysToAdd);

    if (currentHour >= 19 && format(date, "yyyy-MM-dd") === format(addDays(today, 1), "yyyy-MM-dd")) {
      return false;
    }

    const formattedDate = format(date, "yyyy-MM-dd");
    const isUnavailable = unavailableDates.includes(formattedDate);
    const isSunday = getDay(date) === 0;
    return date >= addDays(today, 1) && date <= threeDaysAhead && !isUnavailable && !isSunday;
  };

  return (
    <div className="App">
      <form onSubmit={handleSubmit}>
        <label htmlFor="orderNumber">Order #</label>
        <input
          type="text"
          id="orderNumber"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />
        
        <label htmlFor="name">Name</label>
        <div className="name-fields">
          <input
            type="text"
            id="firstName"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            type="text"
            id="lastName"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <label htmlFor="phoneNumber">Phone Number</label>
        <input
          type="text"
          id="phoneNumber"
          placeholder="(___)___-___"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <label htmlFor="deliveryAddress">Delivery Address</label>
        <input
          type="text"
          id="deliveryAddress"
          placeholder="Enter a location"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
        />

        <label htmlFor="deliveryDate">Delivery Date</label>
        <div>
          <DatePicker
            selected={deliveryDate}
            onChange={(date) => setDeliveryDate(date)}
            filterDate={isDateSelectable}
            inline
          />
        </div>

        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}
        <button type="submit">Schedule Now</button>
      </form>
    </div>
  );
}

export default App;
