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

  // Hide previous messages
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

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

  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.textContent = 'SENDING...';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, subject, message })
    });

    const data = await response.json();

    if (response.ok) {
      // Show success message
      successDiv.style.display = 'block';

      // Clear the form
      document.getElementById('contactForm').reset();
    } else {
      errorDiv.textContent = data.error || 'Failed to send message. Please try again.';
      errorDiv.style.display = 'block';
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
