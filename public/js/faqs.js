function toggleFaq(button) {
  const faqItem = button.parentElement;
  const answer = faqItem.querySelector('.faq-answer');
  const icon = button.querySelector('.faq-icon');

  // Close all other FAQs in the same category
  const category = faqItem.parentElement;
  const allItems = category.querySelectorAll('.faq-item');

  allItems.forEach(item => {
    if (item !== faqItem) {
      const otherAnswer = item.querySelector('.faq-answer');
      const otherIcon = item.querySelector('.faq-icon');
      if (otherAnswer.style.display === 'block') {
        otherAnswer.style.display = 'none';
        otherIcon.style.transform = 'rotate(0deg)';
      }
    }
  });

  // Toggle current FAQ
  if (answer.style.display === 'none' || answer.style.display === '') {
    answer.style.display = 'block';
    icon.style.transform = 'rotate(180deg)';
  } else {
    answer.style.display = 'none';
    icon.style.transform = 'rotate(0deg)';
  }
}
