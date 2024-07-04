import React, { useState } from 'react';
import './App.css';
import { format } from 'date-fns';

function App() {
  const [orderNumber, setOrderNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!orderNumber || !firstName || !lastName || !phoneNumber || !deliveryAddress || !deliveryDate) {
      setError('All fields are required.');
    } else {
      setError('');
      setSuccessMessage('');
      const name = `${firstName} ${lastName}`;
      const submissionDateTime = format(new Date(), "yyyy-MM-dd hh:mm a"); // Get the current date and time in the desired format
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
          deliveryDate,
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
        <div>
          This is at the top of your confirmation email.
          Questions? Call us at (720) 689-4656
        </div>
        

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

        <label htmlFor="deliveryDate">Delivery Date*</label>
        <input
          type="date"
          id="deliveryDate"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />

        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}
        <button type="submit">SUBMIT</button>
      </form>
    </div>
  );
}

export default App;
