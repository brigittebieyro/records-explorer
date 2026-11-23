// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Every test reads src/Data/testWsoConfig.json in place of the deployment's wsoConfig.json, so
// test results do not depend on which settings a WSO has configured.
jest.mock('./Data/wsoConfig.json', () => jest.requireActual('./Data/testWsoConfig.json'));
