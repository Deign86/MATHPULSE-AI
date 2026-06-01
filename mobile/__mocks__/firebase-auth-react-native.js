// Mock for firebase/auth/react-native — not exported by firebase package in Node.js
module.exports = {
  getReactNativePersistence: jest.fn(() => ({})),
};
