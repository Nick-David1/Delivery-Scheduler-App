import React, { useState } from 'react';
import './App.css';

function App() {
  const [orderNumber, setOrderNumber] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!orderNumber || !name || !phoneNumber || !deliveryAddress || !deliveryDate) {
      setError('All fields are required.');
    } else {
      setError('');
      setSuccessMessage('');
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
          deliveryDate
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

        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label htmlFor="phoneNumber">Phone Number </label>
        <input
          type="text"
          id="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <label htmlFor="deliveryAddress">Delivery Address</label>
        <input
          type="text"
          id="deliveryAddress"
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
