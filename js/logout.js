const logout = document.createElement('button');
logout.type = 'button';
logout.textContent = '退出登录';
logout.className = 'btn';
logout.addEventListener('click', async () => {
  try {
    const response = await fetch('/api/logout', {method: 'POST'});
    if (!response.ok) throw new Error('退出失败，请重试');
    location.assign('/');
  } catch (error) { alert(error.message); }
});
document.body.append(logout);
