document.addEventListener('DOMContentLoaded', () => {

    
    // --- Configuration ---
    const FLASK_BACKEND_BASE_URL = 'http://127.0.0.1:8000'; // Base URL for your Flask backend
    const SUMMARIZATION_ENDPOINT = `${FLASK_BACKEND_BASE_URL}/upload_and_summarize`; // New endpoint for USG report summarization
    
    const USG_SUMMARIZATION_ENDPOINT = 'http://127.0.0.1:8000/upload_and_generate_usg_report'; // Adjust port if needed

    const SAVE_PATIENT_ENDPOINT = `${FLASK_BACKEND_BASE_URL}/save_patient_data`; // New endpoint for saving data
    const GET_ALL_PATIENT_DATA_ENDPOINT = `${FLASK_BACKEND_BASE_URL}/get_patient_all_data`; // New endpoint


    //const SUMMARIZATION_PROMPT = "Summarize the patient prescription for patientId ";

    const SUMMARIZATION_PROMPT = `Extract and summarize the key details from the doctor's prescription provided below.  

                    Rules for formatting the summary:
                    - If a subsection detail is missing, skip just that line.  
                    - If an entire section has no available details, skip that section completely.  
                    - If the diagnosis is not explicitly mentioned, infer it from the prescribed medicines when possible.  
                    - Ensure the output remains clean, readable, and well-structured.  

                    Organize the summary with the following headings:

                    **Patient Information:**  
                    - Name: [Patient's Name]  
                    - Age: [Age]  
                    - Symptoms: [List symptoms]

                    **Treatment Details:**  
                    - Date of Treatment: [Date]  
                    - Time of Treatment: [Time]  
                    - Diagnosis: [Diagnosis or inferred from medicines]

                    **Provider Information:**  
                    - Doctor's Name: [Doctor's Name]  
                    - Doctor's Email Address / Phone Number: [Contact Information]  
                    - Clinic/Hospital Name: [Clinic/Hospital Name]  

                    **Prescription Summary:**  
                    - [List each medication, dosage, and frequency]

                    **Doctor's Advice, Discharge Summary, Follow-ups:**  
                    - Doctor's Advice: [Advice]  
                    - Discharge Summary: [Summary]  
                    - Follow-up Visits: [Details].`;

    console.log(SUMMARIZATION_PROMPT);


    const USG_REPORT_PROMPT = `
          Generate a concise, structured summary of the following USG (Ultrasound Sonography) report. 
          The summary should be presented in a clean, templated format. 
          Extract and highlight the following key findings:

          1. Patient Demographics: (e.g., Patient ID, Name, Age)
          2. Clinical Indication: (The reason for the scan)
          3. Findings/Observations: (Key details found in the report, e.g., organ size, presence of cysts, masses, or fluid)
          4. Conclusion/Impression: (The final diagnosis or summary of findings by the radiologist)
          5. Recommendation/Follow-up: (Any recommended next steps, if mentioned)

          Return the summary in a simple text format without any extra conversational text.`;


    console.log(USG_REPORT_PROMPT);



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
        const uploadUsgReportVisualBtn = document.getElementById('uploadUsgReportVisualBtn');
        const usgReportUpload = document.getElementById('usgReportUpload');



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

         // New event listener for the patientId input field
        patientIdInput.addEventListener('change', async () => {
            const patientId = patientIdInput.value.trim();
            if (patientId) {
                // Fetch and populate patient details
                await fetchPatientDetails(patientId);
            } else {
                // If ID is cleared, reset the form
                resetPatientForm();
            }
        });


        /**
         * Fetches patient details from the backend and populates the form.
         * @param {string} patientId - The patient's unique ID.
         */
        async function fetchPatientDetails(patientId) {
            console.log(`Fetching details for patient ID: ${patientId}`);
            
            // Temporary variables to hold the original values
            const originalId = patientIdInput.value;
            patientIdInput.disabled = true;

            try {
                const response = await fetch(`${GET_ALL_PATIENT_DATA_ENDPOINT}?patientId=${patientId}`);
                const data = await response.json();

                if (response.ok && data.patientDetails) {
                    console.log('Patient details retrieved:', data.patientDetails);
                    const details = data.patientDetails;
                    fullNameInput.value = details.fullName || '';
                    dobInput.value = details.dob || '';
                    genderSelect.value = details.gender || '';
                    contactInfoInput.value = details.contactInfo || '';
                    addressInput.value = details.address || '';
                    
                    // Display a success message
                    console.log('Patient details populated successfully.');

                } else {
                    console.error('Patient not found or error retrieving data:', data);
                    // Reset fields if patient is not found
                    resetPatientFormExceptId(originalId);
                    alert('No existing patient found with that ID. Please enter new details.');
                }
            } catch (error) {
                console.error('Network or server error when fetching patient details:', error);
                resetPatientFormExceptId(originalId);
                alert('Failed to connect to the backend server to retrieve patient data.');
            } finally {
                patientIdInput.disabled = false;
            }
        }

        function resetPatientFormExceptId(currentId) {
            fullNameInput.value = '';
            dobInput.value = '';
            genderSelect.value = '';
            contactInfoInput.value = '';
            addressInput.value = '';
            medicalHistoryUpload.value = '';
            uploadVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload Medical History';
            uploadVisualBtn.style.backgroundColor = '#6c757d';
            uploadVisualBtn.style.borderColor = '#6c757d';
            patientIdInput.value = currentId; // Re-set the original ID
        }

       /** Handles the file selection and upload process for USG report summarization.
         * This version allows exactly two images, reads them as separate base64 strings,
         * and sends both the base64 strings and their filenames in a single JSON payload.
         */
        usgReportUpload.addEventListener('change', async (event) => {
            const files = event.target.files;

            if (files.length === 0) {
                // Reset button state if no file is selected
                uploadUsgReportVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload USG Report';
                uploadUsgReportVisualBtn.style.backgroundColor = '#6c757d';
                uploadUsgReportVisualBtn.style.borderColor = '#6c757d';
                uploadUsgReportVisualBtn.disabled = false;
                return;
            }

            if (files.length !== 2) {
                alert('Please select exactly two files: a BW image and a Doppler image.');
                usgReportUpload.value = ''; // Clear file input
                uploadUsgReportVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload USG Report';
                uploadUsgReportVisualBtn.style.backgroundColor = '#6c757d';
                uploadUsgReportVisualBtn.style.borderColor = '#6c757d';
                uploadUsgReportVisualBtn.disabled = false;
                return;
            }

            const patientIdInput = document.getElementById('patientId');
            const patientIdStr = String(patientIdInput.value).trim();
            if (patientIdStr.length === 0) {
                alert('Please fill in the Patient ID before uploading files.');
                usgReportUpload.value = '';
                uploadUsgReportVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload USG Report';
                uploadUsgReportVisualBtn.style.backgroundColor = '#6c757d';
                uploadUsgReportVisualBtn.style.borderColor = '#6c757d';
                uploadUsgReportVisualBtn.disabled = false;
                return;
            }

            uploadUsgReportVisualBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Files...';
            uploadUsgReportVisualBtn.disabled = true;
            uploadUsgReportVisualBtn.style.backgroundColor = '#f0ad4e';
            uploadUsgReportVisualBtn.style.borderColor = '#eea236';

            const readFileAsBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve({
                        name: file.name,
                        base64: e.target.result.split(',')[1]
                    });
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
            };

            try {
                const [file1, file2] = files;

                if (!file1.type.startsWith('image/') || !file2.type.startsWith('image/')) {
                    alert('Both selected files must be images.');
                    throw new Error('Invalid file type.');
                }

                const [processedFile1, processedFile2] = await Promise.all([
                    readFileAsBase64(file1),
                    readFileAsBase64(file2)
                ]);

                console.log('Successfully read two images. Sending to backend...');

                // Send a single request with both base64 strings and their names in the body
                const response = await fetch(USG_SUMMARIZATION_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        patientId: patientIdStr,
                        image_bw_name: processedFile1.name, // Added image name
                        image_bw: processedFile1.base64,
                        image_doppler_name: processedFile2.name, // Added image name
                        image_doppler: processedFile2.base64,
                        prompt: ""
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    console.log('USG report summarization successful!', data);
                    const summary = data.response || "No summary provided.";
                    alert('USG Report Summary received:\n\n' + summary);
                } else {
                    console.error('Error during USG report summarization:', data);
                    alert('Error summarizing USG report: ' + (data.error || 'Unknown error. Check console.'));
                }

            } catch (error) {
                console.error('File processing or network error:', error);
                alert('An error occurred during file processing or upload. Please try again.');
            } finally {
                // Reset button state and input
                usgReportUpload.value = '';
                uploadUsgReportVisualBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Upload USG Report';
                uploadUsgReportVisualBtn.disabled = false;
                uploadUsgReportVisualBtn.style.backgroundColor = '#6c757d';
                uploadUsgReportVisualBtn.style.borderColor = '#6c757d';
            }
        });

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
                console.log(viewPrescriptionsBtn)
                console.log('viewPrescriptionsBtn btn clicked')
                window.location.href = 'patient_prescriptions.html';
            });

                // Handle navigation to the USG reports page

        const viewUsgReportsBtn = document.getElementById('viewUsgReportsBtn');
        console.log(viewUsgReportsBtn)
        if (viewUsgReportsBtn) {
            viewUsgReportsBtn.addEventListener('click', () => {
                console.log('Btn clicked')
                window.location.href = 'patient_usg.html';
            });
        }
        
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


    // --- Logic for patient_usg.html (USG Report Overview Page) ---
    else if (window.location.pathname.endsWith('patient_usg.html')) {
        // --- DOM Elements for patient_usg.html ---
        const patientIdSearchInput = document.getElementById('patientIdSearch');
        const loadUsgReportsBtn = document.getElementById('loadUsgReportsBtn');
        const usgReportList = document.getElementById('usgReportList');
        const usgReportDetailContent = document.getElementById('usgReportDetailContent');
        const imageDisplay1 = document.getElementById('imageDisplay1');
        const imageDisplay2 = document.getElementById('imageDisplay2');
        const summaryText = document.getElementById('summaryText');
        const selectedPatientIdDisplay = document.getElementById('selectedPatientId');

        // Elements for general patient details display
        const patientGeneralDetailsDiv = document.getElementById('patientGeneralDetails');
        const detailName = document.getElementById('detailName');
        const detailDob = document.getElementById('detailDob');
        const detailGender = document.getElementById('detailGender');
        const detailContact = document.getElementById('detailContact');
        const detailAddress = document.getElementById('detailAddress');

        // Function to display patient general details (re-used from patient_prescriptions.html)
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
                patientGeneralDetailsDiv.classList.add('not-found');
            }
        }

        // Function to display USG report details
        function displayUsgReportDetails(usgReport) {
            const placeholderText = usgReportDetailContent.querySelector('.placeholder-text');
            if (placeholderText) {
                placeholderText.remove();
            }

            imageDisplay1.innerHTML = '';
            imageDisplay2.innerHTML = '';
            summaryText.textContent = '';

            if (!usgReport) {
                summaryText.textContent = 'No report selected or data not found.';
                return;
            }

            imageDisplay1.innerHTML = `<img src="${usgReport.image_bw_with_uri}" alt="${usgReport.image_bw_name}">`;
            imageDisplay2.innerHTML = `<img src="${usgReport.image_doppler_with_uri}" alt="${usgReport.image_doppler_name}">`;
            summaryText.textContent = usgReport.summary;
        }

        // Function to load and display all data for a given patient ID
        loadUsgReportsBtn.addEventListener('click', async () => {
            const patientId = patientIdSearchInput.value.trim();
            if (!patientId) {
                alert('Please enter a Patient ID to load USG reports.');
                return;
            }

            showLoading(loadUsgReportsBtn, 'Loading...');
            selectedPatientIdDisplay.textContent = `Patient ID: ${patientId}`;

            // Clear previous displays
            usgReportList.innerHTML = '';
            imageDisplay1.innerHTML = '';
            imageDisplay2.innerHTML = '';
            summaryText.textContent = '';
            usgReportList.innerHTML = `<li class="placeholder-item"><i class="fas fa-info-circle"></i> Enter Patient ID and click Load.</li>`;


            try {
                const response = await fetch(`${GET_ALL_PATIENT_DATA_ENDPOINT}?patientId=${patientId}`);
                const data = await response.json();

                if (response.ok) {
                    // Display Patient General Details
                    displayPatientGeneralDetails(data.patientDetails);
                    console.log('Len USG reports')
                    console.log(data.usg_reports.length)


                    // Display USG Reports List
                    if (data.usg_reports && data.usg_reports.length > 0) {


                        usgReportList.innerHTML = ''; // Clear placeholder once data arrives
                        data.usg_reports.forEach((usgReport, index) => {
                            const listItem = document.createElement('li');
                            listItem.innerHTML = `<i class="fas fa-file-medical"></i> ${index + 1}.USG Report(${usgReport.image_bw_name}, ${usgReport.image_doppler_name})- ${usgReport.id}  ${new Date(usgReport.date).toLocaleDateString()}`;
                            listItem.dataset.reportId = usgReport.id;
                            listItem.addEventListener('click', () => {
                                usgReportList.querySelectorAll('li').forEach(li => li.classList.remove('active'));
                                listItem.classList.add('active');
                                displayUsgReportDetails(usgReport);
                            });
                            usgReportList.appendChild(listItem);
                        });
                        // Automatically display the first report's details
                        if (data.usg_reports.length > 0) {
                            usgReportList.querySelector('li').click();
                        }
                    } else {
                        usgReportList.innerHTML = '<li class="placeholder-item"><i class="fas fa-exclamation-circle"></i> No USG reports found for this patient.</li>';
                        usgReportDetailContent.innerHTML = `
                            <p class="placeholder-text">
                                <i class="fas fa-mouse-pointer"></i> Select a report from the left pane to view its summary here.
                            </p>
                            <div id="imageDisplay1" class="image-display"></div>
                            <div id="imageDisplay2" class="image-display"></div>
                            <pre id="summaryText" class="summary-text"></pre>
                        `;
                    }
                } else {
                    displayPatientGeneralDetails(null); // Show 'Patient Not Found'
                    usgReportList.innerHTML = '<li class="placeholder-item"><i class="fas fa-exclamation-circle"></i> No patient found with that ID.</li>';
                }
            } catch (error) {
                console.error('Network or server error when fetching data:', error);
                alert('Failed to connect to the backend server to retrieve data.');
            } finally {
                resetButton(loadUsgReportsBtn);
            }
        });
    }
    // --- End Logic for patient_usg.html ---

});