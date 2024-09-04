import { io } from 'https://cdn.socket.io/4.3.2/socket.io.esm.min.js';

document.addEventListener('DOMContentLoaded', () => {
    showLogin(); // Mostrar la pantalla de login al cargar
});
function getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}
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
    const fileInput = document.getElementById("profilePicture");
const customButton = document.getElementById("custom-button");
const customText = document.getElementById("custom-text");

customButton.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        customText.textContent = fileInput.files[0].name;
    } else {
        customText.textContent = "Ninguna imagen seleccionada";
    }
});
}

// Función para mostrar el chat
function showChat() {
    const userList = document.getElementById('users-list');
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';

    const socket = io({
        auth: {
            username: localStorage.getItem('username'),
            serverOffset: 0
        }
    });

    const userColors = new Map(); // Mapa para almacenar colores de usuario

    socket.on('update user list', (users) => {
    const currentUsers = Array.from(userList.children);
    const currentUsernames = currentUsers.map(li => li.textContent.trim());
    const newUsernames = users.map(user => user.displayName);

    // Identificar los usuarios que se desconectaron
    const disconnectedUsers = currentUsernames.filter(username => !newUsernames.includes(username));

    // Animar la salida de los usuarios desconectados
    disconnectedUsers.forEach(username => {
        const userItem = currentUsers.find(li => li.textContent.trim() === username);
        if (userItem) {
            userItem.classList.add('disconnected');
            void userItem.offsetWidth; // Forzar reflow
            userItem.classList.add('hide');
            setTimeout(() => {
                userItem.remove();
            }, 500); // Esperar el tiempo de la animación antes de eliminar el elemento
        }
    });

    // Limpiar la lista y agregar los usuarios conectados actuales
    userList.innerHTML = '';
    users.forEach(user => {
        const color = userColors.get(user.displayName) || getRandomColor();
        userColors.set(user.displayName, color);

        const item = document.createElement('li');
        const img = document.createElement('img');
        img.src = user.profilePicture ? `/uploads/${user.profilePicture}` : '/uploads/default.jpeg';
        img.alt = user.displayName;
        img.style.width = '30px';
        img.style.height = '30px';
        img.style.borderRadius = '50%';
        item.appendChild(img);

        const text = document.createElement('span');
        text.style.color = color;
        text.textContent = ` ${user.displayName}`;
        item.appendChild(text);

        // Si es un nuevo usuario, aplicamos la animación de conexión
        if (!currentUsernames.includes(user.displayName)) {
            item.classList.add('connected');
            void item.offsetWidth; // Forzar reflow
            item.classList.add('show');
        }

        userList.appendChild(item);
    });
});
    socket.on('chat message', (msg, id, displayName, profilePicture) => {
        const color = userColors.get(displayName) || getRandomColor();
        userColors.set(displayName, color); // Asignar o recuperar el color
        
        const item = document.createElement('li');
        item.classList.add('message-item'); // Solo 'message-item' inicialmente
        
        const img = document.createElement('img');
        img.src = profilePicture ? `/uploads/${profilePicture}` : '/uploads/default.jpg';
        img.alt = displayName;
        img.classList.add('profile-picture');
        
        const messageText = document.createElement('div');
        messageText.classList.add('message-text');
        
        const displayNameElement = document.createElement('span');
        displayNameElement.classList.add('display-name');
        displayNameElement.textContent = displayName;
        displayNameElement.style.color = color;
        
        const messageContent = document.createElement('span');
        messageContent.classList.add('message-content');
        messageContent.textContent = msg;
        
        messageText.appendChild(displayNameElement);
        messageText.appendChild(messageContent);
        item.appendChild(img);
        item.appendChild(messageText);
        
        // Añadir el mensaje al DOM antes de aplicar las animaciones
        messages.appendChild(item);
        
        // Ahora, añadir las clases de animación
        item.classList.add('animate__animated');
    
        // Asegurar que el mensaje sea visible
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

    const response = await fetch('https://live-chat-79xj.onrender.com/login', {
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
