document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const clipboardInput = document.getElementById('clipboardInput');
    const checkClipboardBtn = document.getElementById('checkClipboardBtn');
    const resultsSection = document.getElementById('resultsSection');
    const progressSection = document.getElementById('progressSection');
    const validTokensList = document.getElementById('validTokensList');
    const invalidTokensList = document.getElementById('invalidTokensList');
    const validCount = document.getElementById('validCount');
    const invalidCount = document.getElementById('invalidCount');
    const processedCount = document.getElementById('processedCount');
    const remainingCount = document.getElementById('remainingCount');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressBar = document.getElementById('progressBar');
    const currentToken = document.getElementById('currentToken');

    // Clear previous results
    function clearResults() {
        validTokensList.innerHTML = '';
        invalidTokensList.innerHTML = '';
        validCount.textContent = '0';
        invalidCount.textContent = '0';
    }

    // Drag and drop functionality
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = 'rgba(88, 101, 242, 0.2)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = 'rgba(88, 101, 242, 0.1)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = 'rgba(88, 101, 242, 0.1)';
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'text/plain') {
            handleFile(file);
        } else {
            showError('Please upload a .txt file');
        }
    });

    // File input change handler
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });

    // Clipboard button click handler
    checkClipboardBtn.addEventListener('click', () => {
        const tokens = clipboardInput.value.split('\n').filter(token => token.trim());
        if (tokens.length > 0) {
            clearResults();
            processTokens(tokens);
        } else {
            showError('Please paste some tokens');
        }
    });

    // Click to upload
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const tokens = e.target.result.split('\n').filter(token => token.trim());
            clearResults();
            processTokens(tokens);
        };
        reader.readAsText(file);
    }

    function updateProgress(processed, total) {
        const remaining = total - processed;
        const percentage = Math.round((processed / total) * 100);
        
        processedCount.textContent = processed;
        remainingCount.textContent = remaining;
        progressPercentage.textContent = percentage;
        progressBar.style.width = `${percentage}%`;
    }

    async function processTokens(tokens) {
        showLoading();
        showProgress();
        let validCount = 0;
        let invalidCount = 0;
        const totalTokens = tokens.length;

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i].trim();
            currentToken.textContent = token;
            updateProgress(i, totalTokens);

            try {
                const tokenInfo = await checkToken(token);
                if (tokenInfo.isValid) {
                    validCount++;
                    addTokenToList(token, true, tokenInfo);
                } else {
                    invalidCount++;
                    addTokenToList(token, false);
                }
                // Add a small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Error checking token:', error);
                invalidCount++;
                addTokenToList(token, false);
            }
        }

        updateProgress(totalTokens, totalTokens);
        updateCounts(validCount, invalidCount);
        hideLoading();
        hideProgress();
        showResults();
    }

    async function checkToken(token) {
        try {
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200) {
                const userData = await response.json();
                const creationTime = getAccountCreationTime(userData.id);
                const daysOld = getDaysOld(creationTime);

                return {
                    isValid: true,
                    username: `${userData.username}#${userData.discriminator}`,
                    email: userData.email || 'Not linked',
                    phone: userData.phone || 'Not linked',
                    emailVerified: userData.verified || false,
                    nitro: userData.premium_type > 0,
                    creationTime: creationTime,
                    daysOld: daysOld
                };
            }
            return { isValid: false };
        } catch (error) {
            console.error('Token check error:', error);
            return { isValid: false };
        }
    }

    function getAccountCreationTime(userId) {
        const snowflakeTime = (BigInt(userId) >> 22n) + 1420070400000n;
        const creationTime = new Date(Number(snowflakeTime));
        return creationTime.toISOString().replace('T', ' ').slice(0, 19);
    }

    function getDaysOld(creationTime) {
        const created = new Date(creationTime);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    function addTokenToList(token, isValid, tokenInfo = null) {
        const tokenElement = document.createElement('div');
        tokenElement.className = `token-item ${isValid ? 'valid' : 'invalid'}`;
        
        const tokenText = document.createElement('div');
        tokenText.textContent = token;
        tokenElement.appendChild(tokenText);

        if (isValid && tokenInfo) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'token-info';
            infoDiv.innerHTML = `
                <p><span class="label">Username:</span> <span class="value">${tokenInfo.username}</span></p>
                <p><span class="label">Email:</span> <span class="value">${tokenInfo.email}</span></p>
                <p><span class="label">Phone:</span> <span class="value">${tokenInfo.phone}</span></p>
                <p><span class="label">Email Verified:</span> <span class="value ${tokenInfo.emailVerified ? 'valid' : 'invalid'}">${tokenInfo.emailVerified}</span></p>
                <p><span class="label">Nitro:</span> <span class="value ${tokenInfo.nitro ? 'valid' : 'invalid'}">${tokenInfo.nitro}</span></p>
                <p><span class="label">Created:</span> <span class="value">${tokenInfo.creationTime}</span></p>
                <p><span class="label">Age:</span> <span class="value">${tokenInfo.daysOld} days</span></p>
            `;
            tokenElement.appendChild(infoDiv);
        }
        
        if (isValid) {
            validTokensList.appendChild(tokenElement);
        } else {
            invalidTokensList.appendChild(tokenElement);
        }
    }

    function updateCounts(valid, invalid) {
        validCount.textContent = valid;
        invalidCount.textContent = invalid;
    }

    function showLoading() {
        dropZone.innerHTML = '<i class="fas fa-spinner fa-spin"></i><p>Processing tokens...</p>';
        checkClipboardBtn.disabled = true;
    }

    function hideLoading() {
        dropZone.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Drag & Drop your tokens file here</p>
            <p>or</p>
            <button class="upload-btn" onclick="document.getElementById('fileInput').click()">Choose File</button>
        `;
        checkClipboardBtn.disabled = false;
    }

    function showProgress() {
        progressSection.style.display = 'block';
        resultsSection.style.display = 'none';
    }

    function hideProgress() {
        progressSection.style.display = 'none';
    }

    function showResults() {
        resultsSection.style.display = 'block';
    }

    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        dropZone.appendChild(errorElement);
        setTimeout(() => errorElement.remove(), 3000);
    }
}); 