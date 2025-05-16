// DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        
        // Theme aus localStorage laden
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Icon anpassen
        const icon = themeToggle.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    // Event Listener für eingeloggte Nutzer
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('communityContent').style.display = 'block';
        loadTopics();
    } else {
        // Check if we have a cookie but no auth state
        const token = getCookie('auth_token');
        if (token) {
            auth.signInWithCustomToken(token).catch(() => {
                deleteCookie('auth_token');
                window.location.href = 'https://login.averons-tale.net';
            });
        } else {
            window.location.href = 'https://login.averons-tale.net';
        }
    }
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}
});

function setupCommunity() {
    // Neue Thema Logik
    const newTopicBtn = document.getElementById('newTopicBtn');
    const newTopicForm = document.getElementById('newTopicForm');
    const cancelTopicBtn = document.getElementById('cancelTopicBtn');
    const submitTopicBtn = document.getElementById('submitTopicBtn');
    const topicImage = document.getElementById('topicImage');
    const imagePreview = document.getElementById('imagePreview');
    
    // Neue Thema Button
    newTopicBtn.addEventListener('click', () => {
        newTopicForm.style.display = 'block';
        newTopicBtn.style.display = 'none';
        window.scrollTo({ top: newTopicForm.offsetTop - 20, behavior: 'smooth' });
    });
    
    // Abbrechen Button
    cancelTopicBtn.addEventListener('click', () => {
        newTopicForm.style.display = 'none';
        newTopicBtn.style.display = 'inline-flex';
        document.getElementById('topicTitle').value = '';
        document.getElementById('topicContent').value = '';
        topicImage.value = '';
        imagePreview.style.display = 'none';
        imagePreview.innerHTML = '';
    });
    
    // Bildvorschau
    topicImage.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                imagePreview.innerHTML = `<img src="${event.target.result}" alt="Vorschau">`;
                imagePreview.style.display = 'block';
            };
            
            reader.readAsDataURL(file);
        } else {
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
        }
    });
    
    // Thema erstellen
    submitTopicBtn.addEventListener('click', async () => {
        const category = document.getElementById('topicCategory').value;
        const title = document.getElementById('topicTitle').value.trim();
        const content = document.getElementById('topicContent').value.trim();
        const file = topicImage.files[0];
        
        if (!title || !content) {
            alert('Bitte gib einen Titel und Inhalt für dein Thema ein.');
            return;
        }
        
        submitTopicBtn.disabled = true;
        submitTopicBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Wird erstellt...';
        
        try {
            // Nutzerdaten holen
            const user = auth.currentUser;
            let username = user.displayName;
            if (!username) {
                // Falls kein Displayname, verwende E-Mail ohne Domain
                username = user.email.split('@')[0];
            }
            
            // Thema-Daten
            const topicData = {
                category: category,
                title: title,
                content: content,
                author: username,
                authorId: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                views: 0,
                replies: 0,
                lastReply: null,
                imageUrl: '',
                solved: false
            };
            
            // Bild hochladen falls vorhanden
            if (file) {
                const storageRef = storage.ref(`forum/${user.uid}/${Date.now()}_${file.name}`);
                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();
                topicData.imageUrl = downloadURL;
            }
            
            // Thema in Firestore speichern
            const docRef = await db.collection('forum_topics').add(topicData);
            
            // Formular zurücksetzen
            document.getElementById('topicTitle').value = '';
            document.getElementById('topicContent').value = '';
            topicImage.value = '';
            imagePreview.style.display = 'none';
            imagePreview.innerHTML = '';
            newTopicForm.style.display = 'none';
            newTopicBtn.style.display = 'inline-flex';
            
            // Erfolgsmeldung
            alert('Thema erfolgreich erstellt!');
            
            // Themen neu laden
            loadTopics();
        } catch (error) {
            console.error('Fehler beim Erstellen des Themas:', error);
            alert('Es gab einen Fehler beim Erstellen deines Themas. Bitte versuche es erneut.');
        } finally {
            submitTopicBtn.disabled = false;
            submitTopicBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Thema erstellen';
        }
    });
    
    // FAQ Toggle
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const card = question.closest('.faq-card');
            card.classList.toggle('active');
            
            const answer = card.querySelector('.faq-answer');
            const icon = question.querySelector('i');
            
            if (card.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
                icon.className = 'fas fa-chevron-up';
            } else {
                answer.style.maxHeight = '0';
                icon.className = 'fas fa-chevron-down';
            }
        });
    });
    
    // Initial Themen laden
    loadTopics();
}

// Lädt Themen aus Firestore
function loadTopics() {
    const categories = ['general', 'technical', 'gameplay', 'suggestions'];
    
    categories.forEach(category => {
        const listElement = document.getElementById(`${category}Topics`);
        listElement.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Lade Themen...</div>';
        
        db.collection('forum_topics')
            .where('category', '==', category)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get()
            .then(querySnapshot => {
                listElement.innerHTML = '';
                
                if (querySnapshot.empty) {
                    listElement.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-comment-slash"></i>
                            <p>Noch keine Themen in dieser Kategorie</p>
                        </div>
                    `;
                    return;
                }
                
                querySnapshot.forEach(doc => {
                    const topic = doc.data();
                    const topicId = doc.id;
                    
                    const topicItem = document.createElement('li');
                    topicItem.className = 'topic-item';
                    topicItem.innerHTML = `
                        <div class="topic-main">
                            <div class="topic-avatar">
                                ${getInitials(topic.author)}
                            </div>
                            <div class="topic-content">
                                <a href="/topic.html?id=${topicId}" class="topic-title">${topic.title}</a>
                                <p class="topic-excerpt">${topic.content.substring(0, 150)}${topic.content.length > 150 ? '...' : ''}</p>
                                <div class="topic-meta">
                                    <span class="user-badge">
                                        <span class="user-avatar">${getInitials(topic.author)}</span>
                                        ${topic.author}
                                    </span>
                                    <span>${formatDate(topic.createdAt?.toDate())}</span>
                                    ${topic.solved ? '<span class="solved-badge"><i class="fas fa-check-circle"></i> Gelöst</span>' : ''}
                                </div>
                            </div>
                            <div class="topic-stats">
                                <div class="stat">
                                    <i class="fas fa-eye"></i> ${topic.views || 0}
                                </div>
                                <div class="stat">
                                    <i class="fas fa-comment"></i> ${topic.replies || 0}
                                </div>
                            </div>
                        </div>
                    `;
                    
                    listElement.appendChild(topicItem);
                });
            })
            .catch(error => {
                console.error('Fehler beim Laden der Themen:', error);
                listElement.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Fehler beim Laden der Themen. Bitte versuche es später erneut.</p>
                    </div>
                `;
            });
    });
}

// Hilfsfunktionen
function getInitials(name) {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
}

function formatDate(date) {
    if (!date) return '';
    
    const now = new Date();
    const diff = now - date;
    const diffInMinutes = Math.floor(diff / (1000 * 60));
    const diffInHours = Math.floor(diff / (1000 * 60 * 60));
    const diffInDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Gerade eben';
    if (diffInMinutes < 60) return `Vor ${diffInMinutes} Minuten`;
    if (diffInHours < 24) return `Vor ${diffInHours} Stunden`;
    if (diffInDays === 1) return 'Gestern';
    if (diffInDays < 7) return `Vor ${diffInDays} Tagen`;
    
    return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Icon anpassen
    const icon = document.querySelector('#themeToggle i');
    icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}