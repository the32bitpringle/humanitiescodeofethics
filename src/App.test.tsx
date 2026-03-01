import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders intro modal on first load', () => {
  render(<App />);
  const introTitle = screen.getByText(/Welcome to Humanity's Code of Ethics/i);
  expect(introTitle).toBeInTheDocument();
  
  const understandBtn = screen.getByText(/I Understand/i);
  expect(understandBtn).toBeInTheDocument();
});
