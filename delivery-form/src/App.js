import React, { useState, useEffect } from 'react';
import './App.css';
import { format, addDays, getHours, getDay, startOfDay } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import InputMask from 'react-input-mask';

function App() {
  const [orderNumber, setOrderNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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

  const handleSubmit = (event) => {
    event.preventDefault();
    let hasError = false;

    const requiredFields = [
      { id: 'orderNumber', value: orderNumber },
      { id: 'firstName', value: firstName },
      { id: 'lastName', value: lastName },
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
        deliveryDate: format(startOfDay(new Date(deliveryDate)), "yyyy-MM-dd"), // Ensure the date is sent as start of the day
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
  };

  const handleInputChange = (setter, id) => (event) => {
    setter(event.target.value);
    document.getElementById(id)?.classList.remove('error');
  };

  const isDateSelectable = (date) => {
    if (!Array.isArray(unavailableDates)) {
      return false; // Ensure unavailableDates is an array
    }

    const today = new Date();
    const currentHour = getHours(today);
    const daysToAdd = currentHour >= 19 ? 4 : 3;
    const start = startOfDay(today);
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
        <label htmlFor="orderNumber" className="required">Order #</label>
        <input
          type="text"
          id="orderNumber"
          value={orderNumber}
          onChange={handleInputChange(setOrderNumber, 'orderNumber')}
        />
        
        <label htmlFor="name" className="required">Name</label>
        <div className="name-fields">
          <input
            type="text"
            id="firstName"
            placeholder="First Name"
            value={firstName}
            onChange={handleInputChange(setFirstName, 'firstName')}
          />
          <input
            type="text"
            id="lastName"
            placeholder="Last Name"
            value={lastName}
            onChange={handleInputChange(setLastName, 'lastName')}
          />
        </div>

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
                />
              </div>

              <div className="address-field">
                <label htmlFor="city" className="required">City</label>
                <input
                  type="text"
                  id="city"
                  value={city}
                  onChange={handleInputChange(setCity, 'city')}
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
                />
              </div>

              <div className="address-field">
                <label htmlFor="zipCode" className="required">Postal / Zip Code</label>
                <input
                  type="text"
                  id="zipCode"
                  value={zipCode}
                  onChange={handleInputChange(setZipCode, 'zipCode')}
                />
              </div>
            </div>
          </>
        )}

        <label htmlFor="deliveryDate" className="required">Delivery Date</label>
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

        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}
        <button type="submit">Schedule Now</button>
      </form>
    </div>
  );
}

export default App;
