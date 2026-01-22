// DOM elements
const loginForm = document.getElementById('loginForm');
const loggedInView = document.getElementById('loggedInView');
const apiUrlInput = document.getElementById('apiUrl');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const messageDiv = document.getElementById('message');
const currentApiUrl = document.getElementById('currentApiUrl');
const currentEmail = document.getElementById('currentEmail');

// Load saved settings on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get(['apiUrl', 'email', 'token']);

  if (data.token && data.apiUrl && data.email) {
    // User is logged in
    showLoggedInView(data.apiUrl, data.email);
  } else {
    // Load saved API URL and email if available
    if (data.apiUrl) {
      apiUrlInput.value = data.apiUrl;
    }
    if (data.email) {
      emailInput.value = data.email;
    }
  }
});

// Login button click handler
loginBtn.addEventListener('click', async () => {
  const apiUrl = apiUrlInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Validation
  if (!apiUrl || !email || !password) {
    showMessage('请填写所有字段', 'error');
    return;
  }

  // Validate URL format
  try {
    new URL(apiUrl);
  } catch (e) {
    showMessage('请输入有效的 API URL', 'error');
    return;
  }

  // Disable button during login
  loginBtn.disabled = true;
  loginBtn.textContent = '登录中...';

  try {
    // Make login request
    const response = await fetch(`${apiUrl}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '登录失败');
    }

    // Extract token from response
    // better-auth typically returns token in the response
    const token = result.token || result.session?.token || result.accessToken;

    if (!token) {
      throw new Error('未能获取认证令牌');
    }

    // Save credentials to storage
    await chrome.storage.local.set({
      apiUrl: apiUrl,
      email: email,
      token: token,
    });

    showMessage('登录成功！', 'success');

    // Show logged in view after a short delay
    setTimeout(() => {
      showLoggedInView(apiUrl, email);
    }, 1000);

  } catch (error) {
    showMessage(`登录失败: ${error.message}`, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = '登录';
  }
});

// Logout button click handler
logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['token']);
  showLoginForm();
  showMessage('已退出登录', 'success');
});

// Helper function to show message
function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';

  // Hide message after 3 seconds
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

// Helper function to show logged in view
function showLoggedInView(apiUrl, email) {
  loginForm.style.display = 'none';
  loggedInView.style.display = 'block';
  currentApiUrl.textContent = apiUrl;
  currentEmail.textContent = email;
}

// Helper function to show login form
function showLoginForm() {
  loginForm.style.display = 'block';
  loggedInView.style.display = 'none';
  passwordInput.value = '';
}
