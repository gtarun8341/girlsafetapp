import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SendSMS from 'react-native-sms-x';
import GetLocation from 'react-native-get-location';

export default function App() {
  const [sending, setSending] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savedNumber, setSavedNumber] = useState('');

  // Load stored phone number on app start
  useEffect(() => {
    (async () => {
      try {
        const storedNumber = await AsyncStorage.getItem('sosPhoneNumber');
        if (storedNumber) {
          setSavedNumber(storedNumber);
          setPhoneNumber(storedNumber);
        }
      } catch (err) {
        console.warn('Failed to load stored number', err);
      }
    })();
  }, []);

  // Save number persistently
  const savePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Validation', 'Please enter a valid phone number');
      return;
    }
    try {
      await AsyncStorage.setItem('sosPhoneNumber', phoneNumber.trim());
      setSavedNumber(phoneNumber.trim());
      Alert.alert('Saved', `Default SOS number saved: ${phoneNumber}`);
    } catch (err) {
      console.warn('Error saving phone number', err);
    }
  };

  const requestAllPermissions = async () => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const allGranted =
        result[PermissionsAndroid.PERMISSIONS.SEND_SMS] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        (result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
          PermissionsAndroid.RESULTS.GRANTED ||
          result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED);

      if (!allGranted) {
        Alert.alert(
          'Permission Denied',
          'SMS and Location permissions are required.',
        );
        return false;
      }
    }
    return true;
  };

  const sendSOS = async () => {
    const targetNumber = savedNumber || phoneNumber;

    if (!targetNumber.trim()) {
      Alert.alert('Missing Number', 'Please set an SOS phone number first.');
      return;
    }

    const ok = await requestAllPermissions();
    if (!ok) return;

    setSending(true);
    let message = '🚨 SOS! I need help. Location unavailable.';

    try {
      const location = await GetLocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      const { latitude, longitude } = location;
      message = `SOS! I need help. Location: https://maps.google.com/?q=${latitude},${longitude}`;
    } catch (error) {
      console.warn('⚠️ Location error:', error.message);
    }

    console.log('📤 Sending SMS:', message);

    let timeoutId;
    try {
      timeoutId = setTimeout(() => {
        setSending(false);
        console.warn('⏱️ Timeout fallback');
      }, 5000);

      SendSMS.send(1, targetNumber, message, (msgId, msg) => {
        clearTimeout(timeoutId);
        console.log(`📬 SMS Result: ID=${msgId}, Message=${msg}`);
        Alert.alert('SMS Status', msg);
        setSending(false);
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('❌ SMS send failed:', err);
      Alert.alert('Error', 'Failed to send SMS.');
      setSending(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f8f9fa',
      }}
    >
      <Text style={{ fontSize: 24, marginBottom: 20, fontWeight: '700' }}>
        🚨 GirlSafetyApp SOS
      </Text>

      {savedNumber ? (
        <>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>
            Saved SOS Number:{' '}
            <Text style={{ fontWeight: 'bold', color: '#007bff' }}>
              {savedNumber}
            </Text>
          </Text>

          {/* Custom Button with Adjustable Height */}
          <TouchableOpacity
            onPress={sendSOS}
            disabled={sending}
            style={{
              backgroundColor: sending ? '#999' : '#dc3545',
              paddingVertical: 20, // 👈 Controls inside button height
              borderRadius: 10,
              width: '80%',
              alignItems: 'center',
              justifyContent: 'center',
              marginVertical: 100,
            }}
          >
            <Text
              style={{
                color: 'white',
                fontSize: 18,
                fontWeight: '700',
                textTransform: 'uppercase',
              }}
            >
              {sending ? 'Sending...' : 'Send SOS To Saved Number'}
            </Text>
          </TouchableOpacity>

          <Text style={{ marginVertical: 10 }}>or change it below</Text>
        </>
      ) : (
        <Text style={{ fontSize: 16, marginBottom: 10 }}>
          Set your SOS Number:
        </Text>
      )}

      <TextInput
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          width: '80%',
          marginBottom: 10,
          textAlign: 'center',
          backgroundColor: 'white',
        }}
      />

      {/* Save Number Button (Custom Style) */}
      <TouchableOpacity
        onPress={savePhoneNumber}
        style={{
          backgroundColor: '#28a745',
          paddingVertical: 15,
          borderRadius: 10,
          width: '80%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
          Save Number
        </Text>
      </TouchableOpacity>
    </View>
  );
}
