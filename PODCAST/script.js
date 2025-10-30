// script.js

document.addEventListener('DOMContentLoaded', function () {
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyC4YZeG_t60GX_9EFfMZ9jFDCsLUHbnbz8",
        authDomain: "studycubs-official.firebaseapp.com",
        databaseURL: "https://studycubs-official-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "studycubs-official",
        storageBucket: "studycubs-official.firebasestorage.app",
        messagingSenderId: "328675454729",
        appId: "1:328675454729:web:11ed5ab9607c0e4590edd8",
        measurementId: "G-EWPM4HZ7QP"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Submit form functionality
    const podcastForm = document.getElementById('podcast-form');
    const recordButton = document.getElementById('recordButton');
    const stopButton = document.getElementById('stopButton');
    const audioPreview = document.getElementById('audioPreview');
    const audioFile = document.getElementById('audioFile');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const uploadProgressBarDiv = document.getElementById('uploadProgressBar');

    let mediaRecorder;
    let audioChunks = [];

    // Initialize MediaRecorder
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                const audioURL = URL.createObjectURL(audioBlob);
                audioPreview.src = audioURL;
                audioPreview.style.display = 'block';

                // Create a File object from the Blob
                const audioFileObject = new File([audioBlob], 'recorded_audio.mp3', { type: 'audio/mp3' });

                // Now you can use audioFileObject for upload
                audioFile.files = createFileList(audioFileObject); // Helper function

                audioChunks = [];
            };
        })
        .catch(error => {
            console.error("Error accessing microphone:", error);
            alert("Please allow microphone access to record audio.");
            recordButton.disabled = true;
        });

    // Helper function to create a FileList object
    function createFileList(file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        return dt.files;
    }

    // Record button click
    recordButton.addEventListener('click', () => {
        audioPreview.style.display = 'none';
        recordButton.disabled = true;
        stopButton.disabled = false;
        audioChunks = [];
        mediaRecorder.start();
    });

    // Stop button click
    stopButton.addEventListener('click', () => {
        recordButton.disabled = false;
        stopButton.disabled = true;
        mediaRecorder.stop();
    });


    if (podcastForm) {
        podcastForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const studentName = document.getElementById('studentName').value;
            const episodeTitle = document.getElementById('episodeTitle').value;
            const category = document.getElementById('category').value;
            const description = document.getElementById('description').value;
            const audioFileToUpload = document.getElementById('audioFile').files[0];

            // Handle audio upload to Cloudinary
            uploadAudioToCloudinary(audioFileToUpload, uploadProgressBarDiv)
                .then(audioURL => {
                    // Store metadata in Firestore
                    savePodcastToFirestore(studentName, episodeTitle, category, description, audioURL);
                })
                .catch(error => {
                    console.error("Error uploading audio or saving metadata:", error);
                    alert("An error occurred. Please try again.");
                });
        });
    }

    // Function to upload audio to Cloudinary
    async function uploadAudioToCloudinary(audioFile, uploadProgressBarDiv) {
        // Replace with your Cloudinary upload URL and unsigned preset
        const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/studycubs/upload';
        const UPLOAD_PRESET = 'ml_default';

        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('upload_preset', UPLOAD_PRESET);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', CLOUDINARY_URL, true);

            xhr.upload.onprogress = function (e) {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    uploadProgressBar.style.width = percentComplete + '%';
                    uploadProgressBar.textContent = percentComplete.toFixed(0) + '%';
                }
            };

            xhr.onload = function () {
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    console.log("Cloudinary response:", data);
                    resolve(data.secure_url);
                } else {
                    reject(new Error('Upload failed with status code ' + xhr.status));
                }
            };

            xhr.onerror = function () {
                reject(new Error('Network error occurred during upload.'));
            };

            xhr.send(formData);
        });
    }

    // Function to save podcast metadata to Firestore
    async function savePodcastToFirestore(studentName, episodeTitle, category, description, audioURL) {
        // Replace with your Firebase Firestore configuration
        const FIRESTORE_COLLECTION = 'podcasts';

        const podcastData = {
            name: studentName,
            title: episodeTitle,
            category: category,
            description: description,
            audioURL: audioURL,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            featured: false,
            approved: false
        };

        try {
            // Simulate saving to Firestore
            db.collection(FIRESTORE_COLLECTION).add(podcastData)
                .then((docRef) => {
                    console.log("Document written with ID: ", docRef.id);
                    alert("Podcast submitted successfully!");
                })
                .catch((error) => {
                    console.error("Error adding document: ", error);
                    alert("An error occurred while saving to Firestore.");
                });
        } catch (error) {
            console.error("Firestore save error:", error);
            throw error;
        }
    }

     // Function to display podcasts
     async function displayPodcasts(elementId, featuredOnly = false) {
        const container = document.getElementById(elementId);
        container.innerHTML = ''; // Clear existing content

        let query = db.collection('podcasts').orderBy('createdAt', 'desc');
        if (featuredOnly) {
            query = query.where('featured', '==', true);
        }

        try {
            const snapshot = await query.get();
            snapshot.forEach(doc => {
                const podcast = doc.data();
                const card = document.createElement('div');
                card.classList.add('col-md-4', 'mb-3');
                card.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${podcast.title}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">${podcast.category} - ${podcast.name}</h6>
                            <p class="card-text">${podcast.description}</p>
                            <audio controls src="${podcast.audioURL}"></audio>
                            <p class="card-text"><small class="text-muted">Uploaded on ${podcast.createdAt ? podcast.createdAt.toDate().toLocaleDateString() : 'N/A'}</small></p>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (error) {
            console.error("Error fetching podcasts:", error);
            container.innerHTML = '<p>Error loading podcasts.</p>';
        }
    }

    // Display featured and all podcasts on page load
    displayPodcasts('featured-episodes', true);
    displayPodcasts('all-episodes');

});