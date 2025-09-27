document.addEventListener('DOMContentLoaded', () => {

    
    // --- Configuration ---
    const FLASK_BACKEND_BASE_URL = 'http://127.0.0.1:8000'; // Base URL for your Flask backend
    const SUMMARIZATION_ENDPOINT = `${FLASK_BACKEND_BASE_URL}/upload_and_summarize`;
    const SAVE_PATIENT_ENDPOINT = `${FLASK_BACKEND_BASE_URL}/save_patient_data`; // New endpoint for saving data
    const GET_ALL_PATIENT_DATA_ENDPOINT = `${FLASK_BACKEND_BASE_URL}/get_patient_all_data`; // New endpoint


    const SUMMARIZATION_PROMPT = "Summarize the patient prescription for patientId ";


    // --- Common Functions (Accessible to both index.html and patient_prescriptions.html) ---
    /**
     * Shows a loading state on a button.
     * @param {HTMLElement} button - The button element.
     * @param {string} loadingText - Text to display during loading.
     */
    function showLoading(button, loadingText = 'Processing...') {
        button.dataset.originalText = button.innerHTML;
        button.dataset.originalBg = button.style.backgroundColor;
        button.dataset.originalBorder = button.style.borderColor;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
        button.style.backgroundColor = '#f0ad4e'; // Orange for pending/processing
        button.style.borderColor = '#eea236';
        button.disabled = true;
    }

    /**
     * Resets a button from a loading state.
     * @param {HTMLElement} button - The button element.
     */
    function resetButton(button) {
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            button.style.backgroundColor = button.dataset.originalBg;
            button.style.borderColor = button.dataset.originalBorder;
            button.disabled = false;
        }
    }

    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {

    // --- DOM Elements ---
        const patientIdInput = document.getElementById('patientId');
        const fullNameInput = document.getElementById('fullName');
        const dobInput = document.getElementById('dob');
        const genderSelect = document.getElementById('gender');
        const contactInfoInput = document.getElementById('contactInfo');
        const addressInput = document.getElementById('address');

        const savePatientDetailsBtn = document.getElementById('savePatientDetailsBtn');
        const medicalHistoryUpload = document.getElementById('medicalHistoryUpload'); // The hidden input type="file"
        const uploadBtnWrapper = document.querySelector('.upload-btn-wrapper'); // The div containing the button and input
        const uploadVisualBtn = uploadBtnWrapper.querySelector('.upload-btn'); // The visible button


        // --- Helper Functions ---

        /**
         * Resets all patient registration form fields.
         */
        function resetPatientForm() {
            patientIdInput.value = '';
            fullNameInput.value = '';
            dobInput.value = '';
            genderSelect.value = '';
            contactInfoInput.value = '';
            addressInput.value = '';
            medicalHistoryUpload.value = ''; // Clear selected files
            // Reset the visual state of the upload button if it was showing file names
            uploadVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Medical History';
            uploadVisualBtn.style.backgroundColor = '#6c757d'; // Reset color
            uploadVisualBtn.style.borderColor = '#6c757d';
        }

        /**
         * Handles the saving of patient details (form submission).
         */
        savePatientDetailsBtn.addEventListener('click', async () => {
        
        function isValidDateDDMMYYYY(dateStr) {
            // Regex to check basic dd/mm/yyyy format
            const regex = /^([0-2][0-9]|(3)[0-1])\/(0[1-9]|1[0-2])\/\d{4}$/;
            if (!regex.test(dateStr)) return false;

            // Further validate the date is a real calendar date
            const parts = dateStr.split('/');
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS months 0-11
            const year = parseInt(parts[2], 10);
            const dateObj = new Date(year, month, day);

            return (
                dateObj.getFullYear() === year &&
                dateObj.getMonth() === month &&
                dateObj.getDate() === day
            );
        }

            const dobInputValue = dobInput.value.trim();


            const patientDetails = {
                patientId: String(patientIdInput.value).trim(),
                fullName: String(fullNameInput.value).trim(),
                dob: dobInputValue,  // Already validated format
                gender: String(genderSelect.value).trim(),
                contactInfo: String(contactInfoInput.value).trim(),
                address: String(addressInput.value).trim(),
            };

            // Validate all fields are non-empty strings
            const allFieldsFilled = Object.values(patientDetails).every(
                (field) => typeof field === 'string' && field.length > 0
            );

            if (!allFieldsFilled) {
                alert('Please fill in all required patient details (ID, Full Name, DOB, Gender, Contact Info, Address).');
                return;
            }

            console.log('Attempting to save Patient Details to Redis:', patientDetails);

            try {
                const response = await fetch(SAVE_PATIENT_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(patientDetails),
                });

                const data = await response.json();

                if (response.ok) {
                    console.log('Patient details saved to Redis successfully:', data);
                    alert(`Patient "${patientDetails.fullName}" details saved successfully to Redis!`);
                    resetPatientForm(); // Clear form after successful save
                } else {
                    console.error('Error saving patient details to Redis:', data);
                    alert('Error saving patient details to Redis: ' + (data.error || 'Unknown error. Check console.'));
                }
            } catch (error) {
                console.error('Network or server error when saving patient details:', error);
                alert('Failed to connect to the backend server to save patient details.');
            }
        });

        // Add this missing listener for the visible upload button!
        if (uploadVisualBtn && medicalHistoryUpload) {
            uploadVisualBtn.addEventListener('click', () => {
                console.log('Visible upload button clicked! Triggering hidden input...');
                medicalHistoryUpload.click(); // Programmatically click the hidden file input
            });
        } else {
            console.error("Error: Upload button or hidden file input not found for index.html.");
        }

        /**
         * Handles the file selection and upload process for summarization.
         */
        medicalHistoryUpload.addEventListener('change', async (event) => {
            const files = event.target.files;
            if (files.length === 0) {
                uploadVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Medical History'; // Reset button text
                uploadVisualBtn.style.backgroundColor = '#6c757d'; // Reset color
                uploadVisualBtn.style.borderColor = '#6c757d';
                uploadVisualBtn.disabled = false;
                return;
            }

            const file = files[0]; // Process only the first selected file
            console.log('Selected file for summarization:', file.name, file.type, 'Size:', file.size, 'bytes');

            // Update the visual button to show the selected file name and indicate processing
            uploadVisualBtn.innerHTML = `<i class="fas fa-file-image"></i> ${file.name}`;
            uploadVisualBtn.style.backgroundColor = '#f0ad4e'; // Orange for pending/processing
            uploadVisualBtn.style.borderColor = '#eea236';
            uploadVisualBtn.disabled = true; // Disable button during processing

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please upload an valid image file (e.g., PNG, JPEG, GIF) for summarization.');
                medicalHistoryUpload.value = ''; // Clear file input
                uploadVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Medical History'; // Reset button
                uploadVisualBtn.style.backgroundColor = '#6c757d';
                uploadVisualBtn.style.borderColor = '#6c757d';
                uploadVisualBtn.disabled = false;
                return;
            }

            // Use FileReader to convert the image to Base64
            const reader = new FileReader();

            reader.onloadstart = () => {
                uploadVisualBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Image...';
            };

             const patientIdStr = {
                patientId: String(patientIdInput.value).trim(),
            }


              // Validate all fields are non-empty strings
            const allFieldsFilled = Object.values(patientIdStr).every(
                (field) => typeof field === 'string' && field.length > 0
            );

            if (!allFieldsFilled) {
               alert('Please fill in the Patient ID before uploading a prescription.');
                // Also reset the upload button state here if validation fails
                medicalHistoryUpload.value = '';
                uploadVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Medical History';
                uploadVisualBtn.style.backgroundColor = '#6c757d';
                uploadVisualBtn.style.borderColor = '#6c757d';
                uploadVisualBtn.disabled = false;
                return;
            }

            console.log('Attempting to save Patient Details to Redis:', patientIdStr);

            reader.onload = async (e) => {
                const base64String = e.target.result.split(',')[1]; // Get the base64 part

                const sprompt = SUMMARIZATION_PROMPT + " " + String(patientIdInput.value).trim();

                try {
                    // Send the base64 string to your Flask backend for summarization
                    const response = await fetch(SUMMARIZATION_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            patientId: String(patientIdInput.value).trim(),
                            image_base64: base64String,
                            image_name: file.name,
                            prompt: sprompt
                        }),
                    });

                    const data = await response.json();

                    if (response.ok) {
                        console.log('Image summarization successful!', data);
                        const summary = data.response || "No summary provided.";
                        alert('Prescription summary received:\n\n' + summary);
                    } else {
                        console.error('Error during image summarization:', data);
                        alert('Error summarizing prescription: ' + (data.error || 'Unknown error. Check console.'));
                    }
                } catch (error) {
                    console.error('Network or server error during image summarization:', error);
                    alert('Failed to connect to the summarization server or an unexpected error occurred.');
                } finally {
                    // Always reset button state and input regardless of success/failure
                    medicalHistoryUpload.value = ''; // Clear the file input
                    uploadVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Medical History';
                    uploadVisualBtn.style.backgroundColor = '#6c757d'; // Reset color
                    uploadVisualBtn.style.borderColor = '#6c757d';
                    uploadVisualBtn.disabled = false; // Re-enable button
                }
            };

            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                alert('Error reading file. Please try again.');
                medicalHistoryUpload.value = '';
                uploadVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Medical History';
                uploadVisualBtn.style.backgroundColor = '#6c757d';
                uploadVisualBtn.style.borderColor = '#6c757d';
                uploadVisualBtn.disabled = false;
            };

            reader.readAsDataURL(file); // Start reading the file
        });

        // Handle navigation to the prescriptions page
        viewPrescriptionsBtn.addEventListener('click', () => {
                window.location.href = 'patient_prescriptions.html';
            });

    }

    // --- End Logic for index.html ---


  //prescriptions.html

 // --- Logic for patient_prescriptions.html (Prescription Overview Page) ---
    // --- Logic for patient_prescriptions.html (Prescription Overview Page) ---
    // Make sure this is an `else if` or separate `if`
    else if (window.location.pathname.endsWith('patient_prescriptions.html')) {
        // --- DOM Elements for patient_prescriptions.html ---
        const patientIdSearchInput = document.getElementById('patientIdSearch');
        const loadPrescriptionsBtn = document.getElementById('loadPrescriptionsBtn');
        const prescriptionList = document.getElementById('prescriptionList');
        const prescriptionDetailContent = document.getElementById('prescriptionDetailContent');
        const imageDisplay = document.getElementById('imageDisplay');
        const summaryText = document.getElementById('summaryText');
        const selectedPatientIdDisplay = document.getElementById('selectedPatientId');

        // Elements for general patient details display
        const patientGeneralDetailsDiv = document.getElementById('patientGeneralDetails');
        const detailName = document.getElementById('detailName');
        const detailDob = document.getElementById('detailDob');
        const detailGender = document.getElementById('detailGender');
        const detailContact = document.getElementById('detailContact');
        const detailAddress = document.getElementById('detailAddress');

        // Function to display patient general details
        function displayPatientGeneralDetails(details) {
            if (details) {
                detailName.textContent = details.fullName || 'N/A';
                detailDob.textContent = details.dob || 'N/A';
                detailGender.textContent = details.gender ? details.gender.charAt(0).toUpperCase() + details.gender.slice(1) : 'N/A';
                detailContact.textContent = details.contactInfo || 'N/A';
                detailAddress.textContent = details.address || 'N/A';
                patientGeneralDetailsDiv.classList.remove('not-found');
            } else {
                detailName.textContent = 'Patient Not Found';
                detailDob.textContent = 'N/A';
                detailGender.textContent = 'N/A';
                detailContact.textContent = 'N/A';
                detailAddress.textContent = 'N/A';
                patientGeneralDetailsDiv.classList.add('not-found'); // Add class for styling
            }
        }

        // Function to display prescription details
        function displayPrescriptionDetails(prescription) {
            // Remove the initial placeholder text if it exists
            const placeholderText = prescriptionDetailContent.querySelector('.placeholder-text');
            if (placeholderText) {
                placeholderText.remove();
            }

            // Ensure imageDisplay and summaryText are cleared before new content
            imageDisplay.innerHTML = '';
            summaryText.textContent = '';

            if (!prescription) {
                imageDisplay.innerHTML = '';
                summaryText.textContent = 'No prescription selected or data not found.';
                return;
            }
            // Ensure the imageDisplay and summaryText elements exist and are correctly targeted
            prescription_img_name = "Prescription Summary - Dated " + prescription.date
            imageDisplay.innerHTML = `<img src="${prescription.image_with_uri}" alt="${prescription_img_name}">`;
            summaryText.textContent = prescription.summary;
            console.log(prescription.full_image_base64_with_uri)
        }


        // Function to load and display all data for a given patient ID
        loadPrescriptionsBtn.addEventListener('click', async () => {
            const patientId = patientIdSearchInput.value.trim();
            if (!patientId) {
                alert('Please enter a Patient ID to load prescriptions.');
                return;
            }

            showLoading(loadPrescriptionsBtn, 'Loading...');
            selectedPatientIdDisplay.textContent = `Patient ID: ${patientId}`; // Display current patient ID
            
            // Clear previous displays
            prescriptionList.innerHTML = ''; 
            imageDisplay.innerHTML = ''; 
            summaryText.textContent = '';
            // Re-add default placeholder if needed for prescription list
            prescriptionList.innerHTML = `<li class="placeholder-item"><i class="fas fa-info-circle"></i> Enter Patient ID and click Load.</li>`;


            try {
                const response = await fetch(`${GET_ALL_PATIENT_DATA_ENDPOINT}?patientId=${patientId}`);
                const data = await response.json();

                 if (response.ok) {
                    // Display Patient General Details
                    displayPatientGeneralDetails(data.patientDetails);

                    // Display Prescriptions List
                    if (data.prescriptions && data.prescriptions.length > 0) {
                        prescriptionList.innerHTML = ''; // Clear placeholder once data arrives
                        data.prescriptions.forEach((prescription, index) => {
                            const listItem = document.createElement('li');
                            listItem.innerHTML = `<i class="fas fa-file-prescription"></i> ${index + 1}.Prescription(${prescription.imageName}) - ${prescription.id}  (${new Date(prescription.date).toLocaleDateString()})`;
                            listItem.dataset.prescriptionId = prescription.id;
                            listItem.addEventListener('click', () => {
                                prescriptionList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
                                listItem.classList.add('active');
                                displayPrescriptionDetails(prescription);
                            });
                            prescriptionList.appendChild(listItem);
                        });
                        // Automatically display the first prescription's details
                        if (data.prescriptions.length > 0) {
                            prescriptionList.querySelector('li').click();
                        }
                    } else {
                        prescriptionList.innerHTML = '<li class="placeholder-item"><i class="fas fa-exclamation-circle"></i> No prescriptions found for this patient.</li>';
                        // Reset right pane content to its initial placeholder if no prescriptions
                         prescriptionDetailContent.innerHTML = `
                            <p class="placeholder-text">
                                <i class="fas fa-mouse-pointer"></i> Select a prescription from the left pane to view its summary here.
                            </p>
                            <div id="imageDisplay" class="image-display"></div>
                            <pre id="summaryText" class="summary-text"></pre>
                        `;
                    }
                } else {
                    console.error('Error loading all patient data:', data);
                    displayPatientGeneralDetails(null); // Show "Patient Not Found"
                    prescriptionList.innerHTML = `<li class="placeholder-item error-item"><i class="fas fa-exclamation-triangle"></i> Error loading prescriptions: ${data.error || 'Unknown error.'}</li>`;
                    alert('Error loading patient data: ' + (data.error || 'Unknown error.'));
                }
            } catch (error) {
                console.error('Network or server error loading all patient data:', error);
                displayPatientGeneralDetails(null); // Show "Patient Not Found"
                prescriptionList.innerHTML = '<li class="placeholder-item error-item"><i class="fas fa-times-circle"></i> Failed to connect to backend to load patient data.</li>';
                alert('Failed to connect to backend to load patient data.');
            } finally {
                resetButton(loadPrescriptionsBtn);
            }
        });

    }
    // --- End Logic for patient_prescriptions.html ---

});