// Generate random math problem for captcha
function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const operators = ['+', '-', '*'];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let answer;
  let displayOperator = operator;

  switch (operator) {
    case '+':
      answer = num1 + num2;
      break;
    case '-':
      // Ensure positive result
      if (num1 >= num2) {
        answer = num1 - num2;
      } else {
        answer = num2 - num1;
        document.getElementById('mathProblem').textContent = `${num2} - ${num1}`;
        document.getElementById('captchaExpected').value = answer;
        return;
      }
      break;
    case '*':
      answer = num1 * num2;
      displayOperator = '\u00D7'; // multiplication symbol
      break;
  }

  document.getElementById('mathProblem').textContent = `${num1} ${displayOperator} ${num2}`;
  document.getElementById('captchaExpected').value = answer;
}

// Initialize captcha when page loads
document.addEventListener('DOMContentLoaded', function() {
  generateCaptcha();
});

async function submitContactForm(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const errorDiv = document.getElementById('contactError');
  const successDiv = document.getElementById('contactSuccess');

  // Get form values
  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const subject = document.getElementById('contactSubject').value;
  const message = document.getElementById('contactMessage').value.trim();
  const captchaAnswer = document.getElementById('captchaAnswer').value.trim();
  const captchaExpected = document.getElementById('captchaExpected').value;
  const honeypot = document.getElementById('honeypot').value;

  // Hide previous messages
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  // Honeypot check - if filled, silently reject (bots fill hidden fields)
  if (honeypot) {
    // Pretend success to confuse bots
    successDiv.style.display = 'block';
    document.getElementById('contactForm').reset();
    generateCaptcha();
    return;
  }

  // Validate
  if (!name || !email || !subject || !message) {
    errorDiv.textContent = 'Please fill in all required fields';
    errorDiv.style.display = 'block';
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errorDiv.textContent = 'Please enter a valid email address';
    errorDiv.style.display = 'block';
    return;
  }

  // Captcha validation
  if (!captchaAnswer) {
    errorDiv.textContent = 'Please solve the math problem to verify you\'re human';
    errorDiv.style.display = 'block';
    return;
  }

  if (captchaAnswer !== captchaExpected) {
    errorDiv.textContent = 'Incorrect answer. Please try again.';
    errorDiv.style.display = 'block';
    generateCaptcha(); // Generate new problem
    document.getElementById('captchaAnswer').value = '';
    return;
  }

  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.textContent = 'SENDING...';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        subject,
        message,
        captcha: captchaAnswer,
        captchaExpected: captchaExpected
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Show success message
      successDiv.style.display = 'block';

      // Clear the form
      document.getElementById('contactForm').reset();

      // Generate new captcha for next submission
      generateCaptcha();
    } else {
      errorDiv.textContent = data.error || 'Failed to send message. Please try again.';
      errorDiv.style.display = 'block';

      // Regenerate captcha on failure
      if (data.error && data.error.includes('verification')) {
        generateCaptcha();
        document.getElementById('captchaAnswer').value = '';
      }
    }
  } catch (error) {
    console.error('Error sending message:', error);
    errorDiv.textContent = 'Network error. Please check your connection and try again.';
    errorDiv.style.display = 'block';
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = 'SEND MESSAGE';
  }
}
