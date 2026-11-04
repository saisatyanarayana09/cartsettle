import React, { useState } from 'react';
import { useNavigate } from '../../router';
import WelcomeSequence from '../../components/welcome/WelcomeSequence';
import { readWelcomeName } from '../../components/welcome/welcome-lifecycle';

const Welcome = () => {
  const navigate = useNavigate();
  const [ownerName] = useState(() => {
    try {
      return readWelcomeName(window.localStorage, 'smart-kirana-owner-user');
    } catch {
      return '';
    }
  });

  return (
    <WelcomeSequence
      greeting="Welcome back"
      name={ownerName}
      onContinue={() => navigate('/owner')}
    />
  );
};
export default Welcome;
