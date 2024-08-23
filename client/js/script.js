import { io } from 'https://cdn.socket.io/4.3.2/socket.io.esm.min.js';

document.addEventListener('DOMContentLoaded', () => {
    showLogin(); // Mostrar la pantalla de login al cargar
});

// Función para mostrar el formulario de login
function showLogin() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'none';
}

// Función para mostrar el formulario de registro
function showRegister() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'block';
    document.getElementById('chat-container').style.display = 'none';
}

// Función para mostrar el chat
function showChat() {
    
    const userList = document.getElementById('users-list');
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const messages = document.getElementById('messages')
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';

    const socket = io({
        auth: {
            username: localStorage.getItem('username'),
            serverOffset: 0
        }
    });
    socket.on('update user list', (users) => {
        userList.innerHTML = ''; // Clear previous list
        users.forEach(user => {
            const item = document.createElement('li');
            const img = document.createElement('img');
            img.src = user.profilePicture ? `/uploads/${user.profilePicture}` : '/default-profile.png';
            img.alt = user.displayName;
            img.style.width = '30px';
            img.style.height = '30px';
            img.style.borderRadius = '50%';
            item.appendChild(img);
            const text = document.createTextNode(` ${user.displayName}`);
            item.appendChild(text);
            userList.appendChild(item);
        });
    });
    socket.on('chat message', (msg, id, displayName, profilePicture) => {
        const item = document.createElement('li');
        item.classList.add('message-item'); // Añade la clase para el estilo
    
        const img = document.createElement('img');
        img.src = profilePicture ? `/uploads/${profilePicture}` : '/default-profile.png';
        img.alt = displayName;
        img.classList.add('profile-picture'); // Añade la clase para el estilo
    
        const messageText = document.createElement('div');
        messageText.classList.add('message-text');
    
        const displayNameElement = document.createElement('span');
        displayNameElement.classList.add('display-name');
        displayNameElement.textContent = displayName;
    
        const messageContent = document.createElement('span');
        messageContent.classList.add('message-content');
        messageContent.textContent = msg;
    
        // Append display name and message content to messageText div
        messageText.appendChild(displayNameElement);
        messageText.appendChild(messageContent);
    
        // Append image and messageText div to the li element
        item.appendChild(img);
        item.appendChild(messageText);
    
        messages.appendChild(item);
        item.scrollIntoView();
    });
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value) {
            socket.emit('chat message', input.value);
            input.value = '';
        }
    });
}

// Manejo del formulario de login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (response.ok) {
        localStorage.setItem('username', username);
        showChat(); // Muestra la interfaz de chat
    } else {
        alert('Login failed');
    }
});

// Manejo del botón de registro
document.getElementById('registerButton').addEventListener('click', (e) => {
    e.preventDefault();
    showRegister(); // Mostrar el formulario de registro
});

// Manejo del formulario de registro
// Manejo del formulario de registro
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('username', document.getElementById('registerUsername').value.trim());
    formData.append('password', document.getElementById('registerPassword').value.trim());
    formData.append('displayName', document.getElementById('displayName').value.trim());
    formData.append('profilePicture', document.getElementById('profilePicture').files[0]);

    try {
        const response = await fetch('/register', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            alert('Registration successful');
            showLogin();
        } else {
            alert('Registration failed: ' + (await response.text()));
        }
    } catch (error) {
        console.error('Error during registration:', error);
        alert('An error occurred during registration. Please try again.');
    }
});

// Manejo del botón de regreso al login
document.getElementById('backToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showLogin(); // Mostrar el formulario de login
});
