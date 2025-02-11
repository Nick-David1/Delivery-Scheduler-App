import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import './App.css';
import { format, addDays, getHours, getDay, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import InputMask from 'react-input-mask';

const TIMEZONE = 'America/Denver';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Form />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </Router>
  );
}

function Form() {
  const [orderNumber, setOrderNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(''); 
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [streetAddress2, setStreetAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [addressSelected, setAddressSelected] = useState(false);
  const [contactlessDelivery, setContactlessDelivery] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUnavailableDates = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/unavailable-dates');
        const data = await response.json();
        setUnavailableDates(data.unavailableDates || []); // Ensure unavailableDates is always an array
      } catch (error) {
        console.error('Error fetching unavailable dates:', error);
        setUnavailableDates([]); // Set to an empty array on error
      }
    };
    fetchUnavailableDates();

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&libraries=places&callback=initAutocomplete`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    script.addEventListener('load', () => {
      console.log('Google Maps script loaded');
      if (window.google) {
        console.log('Google Maps available');
        initAutocomplete();
      }
    });
  }, []);

  const initAutocomplete = () => {
    const input = document.getElementById('streetAddress');
    const options = {
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'geometry', 'icon', 'name'],
      types: ['address'],
    };
    const autocomplete = new window.google.maps.places.Autocomplete(input, options);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.address_components) {
        const addressComponents = place.address_components;
        const getAddressComponent = (type) =>
          addressComponents.find(component => component.types.includes(type))?.long_name || '';
        
        setStreetAddress(`${getAddressComponent('street_number')} ${getAddressComponent('route')}`);
        setCity(getAddressComponent('locality'));
        setState(getAddressComponent('administrative_area_level_1'));
        setZipCode(getAddressComponent('postal_code'));
        setAddressSelected(true);
      }
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    let hasError = false;

    const requiredFields = [
      { id: 'orderNumber', value: orderNumber },
      { id: 'firstName', value: firstName },
      { id: 'lastName', value: lastName },
      { id: 'email', value: email },
      { id: 'phoneNumber', value: phoneNumber },
      { id: 'streetAddress', value: streetAddress },
      { id: 'city', value: city },
      { id: 'state', value: state },
      { id: 'zipCode', value: zipCode },
      { id: 'deliveryDate', value: deliveryDate },
    ];

    requiredFields.forEach(field => {
      const element = document.getElementById(field.id);
      if (!field.value) {
        setError('* fields are required');
        element?.classList.add('error');
        hasError = true;
      } else {
        element?.classList.remove('error');
      }
    });

    if (!addressSelected) {
      setError('Please use the autocomplete feature to select an address.');
      document.getElementById('streetAddress')?.classList.add('error');
      hasError = true;
    }

    if (!deliveryDate) {
      setError('Please select a delivery date.');
      document.getElementById('deliveryDate')?.classList.add('error');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setError('');
    setSuccessMessage('');
    const name = `${firstName} ${lastName}`;
    const deliveryAddress = `${streetAddress} ${streetAddress2}, ${city}, ${state}, ${zipCode}`;
    const submissionDateTime = format(new Date(), "yyyy-MM-dd HH:mm a");
    const zonedDeliveryDate = formatInTimeZone(deliveryDate, TIMEZONE, "yyyy-MM-dd");

    const postData = {
      orderNumber,
      name,
      email, 
      phoneNumber,
      deliveryAddress,
      deliveryDate: zonedDeliveryDate,
      submissionDateTime,
      contactlessDelivery: contactlessDelivery ? 'Yes' : 'No',
      deliveryInstructions
    };

    console.log('Posting data:', postData); // Debugging

    // Send data to the server
    try {
      const response = await fetch('http://localhost:5001/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      const data = await response.json();
      console.log('Success:', data);
      setSuccessMessage('Order details submitted successfully!');
      navigate('/success', { state: { deliveryDate: deliveryDate.toISOString(), email } });
    } catch (error) {
      console.error('Error:', error);
      setError('Error submitting order details.');
    }
  };

  const handleInputChange = (setter, id) => (event) => {
    setter(event.target.value);
    document.getElementById(id)?.classList.remove('error');
  };

  const handleOrderNumberChange = (event) => {
    const value = event.target.value.replace(/\D/g, '');
    setOrderNumber(value);
  };

  const handleDeliveryInstructionsChange = (event) => {
    const words = event.target.value.split(' ');
    if (words.length <= 250) {
      setDeliveryInstructions(event.target.value);
    }
  };

  const isDateSelectable = (date) => {
    if (!Array.isArray(unavailableDates)) {
      return false; // Ensure unavailableDates is an array
    }

    const today = new Date();
    const currentHour = getHours(today);
    const daysToAdd = currentHour >= 19 ? 4 : 3;
    const end = startOfDay(addDays(today, daysToAdd));

    if (currentHour >= 19 && format(date, "yyyy-MM-dd") === format(addDays(today, 1), "yyyy-MM-dd")) {
      return false;
    }

    const formattedDate = format(startOfDay(date), "yyyy-MM-dd");
    const isUnavailable = unavailableDates.includes(formattedDate);
    const isSunday = getDay(date) === 0;
    return date >= addDays(today, 1) && date <= end && !isUnavailable && !isSunday;
  };

  return (
    <div className="App">
      <form onSubmit={handleSubmit}>
        <h1>Schedule Delivery</h1>
        <label htmlFor="orderNumber" className="required">Order #</label>
        <input
          type="text"
          id="orderNumber"
          value={orderNumber}
          onChange={handleOrderNumberChange}
          maxLength={500}
        />
        
        <label htmlFor="name" className="required">Name</label>
        <div className="name-fields">
          <input
            type="text"
            id="firstName"
            placeholder="First Name"
            value={firstName}
            onChange={handleInputChange(setFirstName, 'firstName')}
            maxLength={500}
          />
          <input
            type="text"
            id="lastName"
            placeholder="Last Name"
            value={lastName}
            onChange={handleInputChange(setLastName, 'lastName')}
            maxLength={500}
          />
        </div>

        <label htmlFor="email" className="required">Email</label>
        <input
          type="email"
          id="email"
          placeholder="Enter valid email"
          value={email}
          onChange={handleInputChange(setEmail, 'email')}
          maxLength={500}
        />

        <label htmlFor="phoneNumber" className="required">Phone Number</label>
        <InputMask
          mask="(999) 999-9999"
          value={phoneNumber}
          onChange={handleInputChange(setPhoneNumber, 'phoneNumber')}
          maskChar="_"
        >
          {() => <input
            type="text"
            id="phoneNumber"
            placeholder="(___) ___-____"
          />}
        </InputMask>

        <label htmlFor="streetAddress" className="required">Street Address</label>
        <input
          type="text"
          id="streetAddress"
          placeholder="Enter a location"
          value={streetAddress}
          onChange={handleInputChange(setStreetAddress, 'streetAddress')}
          maxLength={500}
        />

        {addressSelected && (
          <>
            <div className="address-fields">
              <div className="address-field">
                <label htmlFor="streetAddress2">Address Line 2</label>
                <input
                  type="text"
                  id="streetAddress2"
                  value={streetAddress2}
                  onChange={(e) => setStreetAddress2(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div className="address-field">
                <label htmlFor="city" className="required">City</label>
                <input
                  type="text"
                  id="city"
                  value={city}
                  onChange={handleInputChange(setCity, 'city')}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="address-fields">
              <div className="address-field">
                <label htmlFor="state" className="required">State / Province</label>
                <input
                  type="text"
                  id="state"
                  value={state}
                  onChange={handleInputChange(setState, 'state')}
                  maxLength={500}
                />
              </div>

              <div className="address-field">
                <label htmlFor="zipCode" className="required">Postal / Zip Code</label>
                <input
                  type="text"
                  id="zipCode"
                  value={zipCode}
                  onChange={handleInputChange(setZipCode, 'zipCode')}
                  maxLength={500}
                />
              </div>
            </div>
          </>
        )}

        <label htmlFor="deliveryDate" className="required label-with-padding">Delivery Date</label>
        <p> We will send you an email with your estimated time block the night before, followed by a call 30 minutes prior to our arrival. </p>
        <div>
          <DatePicker
            selected={deliveryDate}
            onChange={(date) => {
              setDeliveryDate(startOfDay(date)); // Ensure the date is set to start of the day
              document.getElementById('deliveryDate')?.classList.remove('error');
            }}
            filterDate={isDateSelectable}
            inline
          />
        </div>

        <div className="contactless-delivery">
          <input
            type="checkbox"
            id="contactlessDelivery"
            checked={contactlessDelivery}
            onChange={() => setContactlessDelivery(!contactlessDelivery)}
          />
          <label className="cd-padding" htmlFor="contactlessDelivery">Request Contactless Delivery</label>
        </div>

        {contactlessDelivery && (
          <div className="delivery-instructions">
            <label htmlFor="deliveryInstructions"></label>
            <textarea
              id="deliveryInstructions"
              placeholder="Add special delivery instructions (e.g., setup in living room, access code 1234, use side entrance, etc.)"
              value={deliveryInstructions}
              onChange={handleDeliveryInstructionsChange}
              maxLength={1000}
            />
          
          </div>
            
        )}
      <p className="disclaimer"> Disclaimer: Apartment stairwells, house stairwells, or basement deliveries cost an extra $60, payable at delivery via cash, Venmo, or Zelle to the third-party. </p>

        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}
        <button className="submitbutton" type="submit">Schedule Now</button>
      </form>
    </div>
  );
}

function SuccessPage() {
  const location = useLocation();
  const { deliveryDate, email } = location.state;

  return (
    <div className="success-page">
      <h1>Submission Successful</h1>
      <p>Your delivery date is on {format(new Date(deliveryDate), 'MMMM d, yyyy')}</p>
      <p>A confirmation email has been sent to: {email}</p>
    </div>
  );
}

export default App;
