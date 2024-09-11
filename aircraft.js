const updateInterval = 4000; // Update interval in milliseconds
const loggingInterval = 1000; // Logging interval in milliseconds

let selectedPosition = { x: 0, y: 0 }; // Initialize selectedPosition
let aircraftBlips = []; // To store all created aircraft blips
let radarCenter = { x: radarScope.offsetWidth / 2, y: radarScope.offsetHeight / 2 }; // Track radar center
let isPaused = false; // to initialise the exercise pause and resume button

class AircraftBlip {
    constructor(callsign, heading, speed, altitude, x, y, ssrCode) {
        this.callsign = callsign;
        this.ssrCode = ssrCode;
        this.heading = heading;
        this.speed = speed;
        this.targetSpeed = speed;
        this.altitude = altitude || 10000;
        this.targetAltitude = this.altitude;
        this.verticalClimbDescendRate = 3000;
        this.speedChangeRate = 10;
        this.position = { x, y };
        this.targetHeading = heading;
        this.headingChangeRate = 2;
        this.turning = false;
        this.orbitLeft = false;  // New property for orbiting left
        this.orbitRight = false; // New property for orbiting right

        // Create elements (blip, label, line)
        this.element = this.createBlipElement();
        this.label = this.createLabelElement();
        this.line = this.createLineElement();
        this.history = [];
        this.historyDots = [];

        // Create history dots
        this.createHistoryDots();

        // Update positions
        this.updateBlipPosition();

        // Ensure the color is updated based on SSR
        this.updateColorBasedOnSSR(); // Call after elements are created
    }


    // Create the blip element for the aircraft
    createBlipElement() {
        const blip = document.createElement('div');
        blip.className = 'aircraft-blip';

        // Apply additional class for plus sign if SSR code is '0000'
        if (this.ssrCode === '0000') {
            blip.classList.add('plus-sign'); // Add the plus sign class
            blip.classList.remove('aircraft-blip'); // Remove the default box class
        } else {
            blip.classList.add('aircraft-blip'); // Ensure the default box style is applied
            blip.classList.remove('plus-sign'); // Remove the plus sign class if it was previously added
        }

        blip.style.position = 'absolute';
        blip.style.zIndex = '2';

        panContainer.appendChild(blip);

        return blip;
    }



    // Update label to show callsign, speed, and altitude in the desired format
    createLabelElement() {
        const label = document.createElement('div');
        label.className = 'aircraft-label';
        label.innerHTML = `${this.callsign}<br>3-${this.ssrCode}<br>A${Math.round(this.altitude / 100)}<br>N${this.speed}`;
        label.style.position = 'absolute';
        label.style.color = 'yellow';
        label.style.zIndex = '3';

        // Check the global labelsVisible flag and hide the label if it's false
        if (!labelsVisible) {
            label.style.display = 'none';
        }

        panContainer.appendChild(label);

        this.label = label;  // Store the label element

        // Update the label info based on the initial SSR code
        this.updateLabelInfo(this);

        return label;
    }

    // Create the line element connecting the blip and the label
    createLineElement() {
        const line = document.createElement('div');
        line.className = 'aircraft-line';
        line.style.position = 'absolute';
        line.style.height = '1px';
        line.style.backgroundColor = 'grey';
        line.style.zIndex = '1';

        // Check the global labelsVisible flag and hide the line if it's false
        if (!labelsVisible) {
            line.style.display = 'none';
        }

        panContainer.appendChild(line);
        return line;
    }

    // Create history dot elements and append to the radar
    createHistoryDots() {
        for (let i = 0; i < 25; i++) {
            const dot = document.createElement('div');
            dot.className = 'history-dot';
            dot.style.opacity = 0; // Initially set opacity to 0
            dot.style.position = 'absolute';
            dot.style.width = '1px';
            dot.style.height = '1px';
            dot.style.backgroundColor = 'yellow';
            dot.style.zIndex = '1';
            panContainer.appendChild(dot);
            this.historyDots.push(dot);
        }
    }

    // Update the blip's position and label position
    updateBlipPosition() {
        const blipSize = 6;
        const scopeCenterX = radarCenter.x;
        const scopeCenterY = radarCenter.y;

        // Update the blip's position
        this.element.style.left = `${scopeCenterX + this.position.x * zoomLevel - blipSize / 2}px`;
        this.element.style.top = `${scopeCenterY - this.position.y * zoomLevel - blipSize / 2}px`;

        // Position the label slightly offset from the blip
        this.label.style.left = `${scopeCenterX + this.position.x * zoomLevel + 10}px`; // Adjust the label position
        this.label.style.top = `${scopeCenterY - this.position.y * zoomLevel - 10}px`; // Adjust the label position

        // Update the line to connect the blip and the label
        this.updateLinePosition();

        this.history.push({ x: this.position.x, y: this.position.y });

        if (this.history.length > 30) {
            this.history.shift();
        }

        this.updateHistoryDots();
    }

    // Update label to show callsign and speed with a 90-degree perpendicular offset to the heading
    updateLabelPosition(blip) {

        // Calculate the offset angle to be perpendicular to the heading
        const angleRad = (this.heading - 180) * Math.PI / 180;
        const labelXOffset = 90 * Math.cos(angleRad); // Distance from the blip to the label in x-direction
        const labelYOffset = 90 * Math.sin(angleRad); // Distance from the blip to the label in y-direction

        // Calculate label position with the perpendicular offset applied
        const labelX = radarCenter.x + this.position.x * zoomLevel + labelXOffset;
        const labelY = radarCenter.y - this.position.y * zoomLevel - labelYOffset;

        // Set label position
        this.label.style.left = `${labelX}px`;
        this.label.style.top = `${labelY}px`;

        //Update Label Info
        this.updateLabelInfo(this);

    }

    updateLabelInfo(blip) {
        // Only display label info if SSR code is not 0000
        if (this.ssrCode !== '0000') {
            this.label.innerHTML = `${this.callsign}<br>3-${this.ssrCode}<br>A${Math.round(this.altitude / 100)}<br>N${this.speed}`;
        } else {
            this.label.innerHTML = `N${this.speed}`; // Display only speed if SSR code is 0000
        }
    }

    setSSRCode(newSSRCode) {
        this.ssrCode = newSSRCode;
        // Remove the existing blip
        this.element.remove();
        // Create a new blip based on the new SSR code
        this.element = this.createBlipElement();
        this.updateBlipPosition();  // Ensure the new blip is positioned correctly
        this.updateLabelInfo();  // Update label info as well
        this.updateColorBasedOnSSR(); // Apply the color change
        updateControlBox(this);  // Update the control box to reflect the SSR code change
    }

    updateColorBasedOnSSR() {
        // Check for emergency codes and set colors
        if (this.ssrCode === '7500' || this.ssrCode === '7600' || this.ssrCode === '7700') {
            // Change to red for emergencies
            this.label.style.color = 'red';
            this.line.style.backgroundColor = 'red';
            this.element.style.backgroundColor = 'red';

            // Change history dots to red
            this.historyDots.forEach(dot => {
                dot.style.backgroundColor = 'red';
            });
        } else {
            // Revert back to default colors
            this.label.style.color = 'yellow';
            this.line.style.backgroundColor = 'grey';
            this.element.style.backgroundColor = 'yellow';

            // Revert history dots to yellow
            this.historyDots.forEach(dot => {
                dot.style.backgroundColor = 'yellow';
            });
        }
    }





    // Update the line position and draw it between the blip and the label
    updateLinePosition() {
        const blipRect = this.element.getBoundingClientRect();
        const blipCenterX = blipRect.left + blipRect.width / 2;
        const blipCenterY = blipRect.top + blipRect.height / 2;
        const labelRect = this.label.getBoundingClientRect();
        const labelTopLeftX = labelRect.left;
        const labelTopLeftY = labelRect.top;

        // Get current pan offsets (dx, dy) from the panContainer
        const panMatrix = new WebKitCSSMatrix(window.getComputedStyle(panContainer).transform);
        const panX = panMatrix.m41;
        const panY = panMatrix.m42;

        // Adjust blip and label positions based on pan offsets
        const adjustedBlipCenterX = blipCenterX - panX;
        const adjustedBlipCenterY = blipCenterY - panY;
        const adjustedLabelTopLeftX = labelTopLeftX - panX;
        const adjustedLabelTopLeftY = labelTopLeftY - panY;

        // Calculate the width and height of the line
        const lineWidth = adjustedLabelTopLeftX - adjustedBlipCenterX;
        const lineHeight = adjustedLabelTopLeftY - adjustedBlipCenterY;

        // Update line position and size
        this.line.style.left = `${adjustedBlipCenterX}px`;
        this.line.style.top = `${adjustedBlipCenterY}px`;
        this.line.style.width = `${Math.sqrt(lineWidth * lineWidth + lineHeight * lineHeight)}px`;
        this.line.style.height = '1px'; // Assuming line height is 1px
        this.line.style.backgroundColor = 'grey';
    }




    // Update the history dots' positions based on the aircraft's history
    updateHistoryDots() {
        // Respect the historyDotsVisible flag
        if (!historyDotsVisible) {
            this.historyDots.forEach(dot => {
                dot.style.opacity = 0;
            });
            return;
        }

        const scopeCenterX = radarCenter.x;
        const scopeCenterY = radarCenter.y;

        // Reverse the opacity calculation: oldest dot fades the most
        for (let i = 0; i < this.historyDots.length; i++) {
            const historyPos = this.history[this.history.length - this.historyDots.length + i];
            const dot = this.historyDots[i];

            if (dot && historyPos) {
                const dotSize = 1;
                dot.style.left = `${scopeCenterX + historyPos.x * zoomLevel - dotSize / 2}px`;
                dot.style.top = `${scopeCenterY - historyPos.y * zoomLevel - dotSize / 2}px`;

                // Oldest dot gets the lowest opacity, newest the highest
                dot.style.opacity = (i + 1) / this.historyDots.length;
            }
        }
    }


    // Update the blip's position and handle turning gradually
    move(headingOnly = false) {
        const speedMetersPerSecond = (this.speed / zoomLevel) * 0.514444;
        const distancePerUpdateMeters = speedMetersPerSecond * (updateInterval / 1000);
        const distancePerUpdateNauticalMiles = distancePerUpdateMeters / 1852;
    
        // Handle orbit left
        if (this.orbitLeft) {
            this.heading = (this.heading - this.headingChangeRate * (headingUpdateInterval / 1000) + 360) % 360;
        }
    
        // Handle orbit right
        if (this.orbitRight) {
            this.heading = (this.heading + this.headingChangeRate * (headingUpdateInterval / 1000)) % 360;
        }
    
        // Handle gradual heading change if not orbiting
        if (!this.orbitLeft && !this.orbitRight && this.heading !== this.targetHeading) {
            let headingDiff = (this.targetHeading - this.heading + 360) % 360;
            const turnRate = this.headingChangeRate * (headingUpdateInterval / 1000);
    
            if (this.turnRight === true) {
                if (headingDiff > 180) {
                    headingDiff = 360 - headingDiff;
                    this.heading = (this.heading + turnRate) % 360;
                } else {
                    this.heading = (this.heading + turnRate) % 360;
                }
            } else if (this.turnRight === false) {
                if (headingDiff <= 180) {
                    headingDiff = 360 - headingDiff;
                    this.heading = (this.heading - turnRate + 360) % 360;
                } else {
                    this.heading = (this.heading - turnRate + 360) % 360;
                }
            }
    
            this.heading = (this.heading + 360) % 360;
    
            if (Math.abs(this.heading - this.targetHeading) <= turnRate) {
                this.heading = this.targetHeading;  // Snap to the target heading
            }
        }
    
        // Update heading in control box every 1 second
        updateControlBox(this);
    
        // If headingOnly is true, don't update the position on the radar
        if (headingOnly) {
            return;
        }
    
        // Update position based on the current heading (every 4 seconds)
        const angleRad = (this.heading - 90) * Math.PI / 180;
        const deltaX = distancePerUpdateNauticalMiles * Math.cos(angleRad);
        const deltaY = distancePerUpdateNauticalMiles * Math.sin(angleRad);
    
        this.position.x += deltaX * zoomLevel;
        this.position.y -= deltaY * zoomLevel;
    
        // Adjust altitude gradually towards the targetAltitude
        const verticalChangePerSecond = this.verticalClimbDescendRate / 60;  // Feet per second
        const verticalChangePerUpdate = verticalChangePerSecond * (updateInterval / 1000);  // Change per update

        if (this.altitude !== this.targetAltitude) {
            const altitudeDiff = this.targetAltitude - this.altitude;
            if (Math.abs(altitudeDiff) <= verticalChangePerUpdate) {
                this.altitude = this.targetAltitude;  // Snap to target altitude if close enough
            } else {
                this.altitude += Math.sign(altitudeDiff) * verticalChangePerUpdate;  // Gradual altitude change
            }

            // Update control box and label
            updateControlBox(this);
            this.updateLabelPosition();
        }

        // Adjust speed gradually towards the targetSpeed
        const speedChangePerUpdate = this.speedChangeRate * (updateInterval / 1000);  // Change per update

        if (this.speed !== this.targetSpeed) {
            const speedDiff = this.targetSpeed - this.speed;
            if (Math.abs(speedDiff) <= speedChangePerUpdate) {
                this.speed = this.targetSpeed;  // Snap to target speed if close enough
            } else {
                this.speed += Math.sign(speedDiff) * speedChangePerUpdate;  // Gradual speed change
            }

            // Update control box and label
            updateControlBox(this);
            this.updateLabelPosition();
        }

        // Update the blip's position on the radar
        this.updateBlipPosition();
    }
    
    

    // Function to start orbiting left
    startOrbitLeft() {
        this.orbitLeft = true;
        this.orbitRight = false; // Stop orbiting right if already orbiting right
        this.turnRight = null; // Disable turning logic
    }

    // Function to start orbiting right
    startOrbitRight() {
        this.orbitLeft = false;
        this.orbitRight = true; // Stop orbiting left if already orbiting left
        this.turnRight = null; // Disable turning logic
    }

    // Function to stop turning (stopping the orbit)
    stopTurn() {
        this.orbitLeft = false;
        this.orbitRight = false;
        this.turnRight = null; // Also stop any heading change logic
    }

    setTargetHeading(newHeading) {
        this.targetHeading = newHeading;
    }

    setTargetSpeed(newSpeed) {
        this.targetSpeed = newSpeed;
    }
}

// Open and close aircraft dialog
function openAircraftDialog() {
    const dialog = document.getElementById('aircraftDialog');
    dialog.style.display = 'block';
    dialog.style.top = `50%`;  // Center the dialog
    dialog.style.left = `50%`;
    dialog.style.transform = `translate(-50%, -50%)`;
    document.getElementById('callsignInput').focus();
}

function closeAircraftDialog() {
    const dialog = document.getElementById('aircraftDialog');
    dialog.style.display = 'none';
}

function validateCallsign() {
    const callsignInput = document.getElementById('callsignInput');
    const callsign = callsignInput.value.trim();
    const existingBlip = aircraftBlips.find(blip => blip.callsign === callsign);

    if (existingBlip || !callsign) {
        callsignInput.style.backgroundColor = '#f8d7da'; // Light red color
        return false;
    }

    callsignInput.style.backgroundColor = ''; // Reset to default
    return true;
}

function validateSsrCode() {
    const ssrInput = document.getElementById('ssrInput');
    const ssrCode = ssrInput.value.trim();

    // Skip duplication check for emergency SSR codes (7500, 7600, 7700)
    if (ssrCode === '7500' || ssrCode === '7600' || ssrCode === '7700') {
        ssrInput.style.backgroundColor = ''; // Reset to default background if valid
        return true; // Valid SSR, allow emergency codes
    }
    const existingSSR = aircraftBlips.find(blip => blip.ssrCode === ssrCode && ssrCode !== '0000');

    // Validate SSR code format and ensure it is unique unless it is '0000'
    if (!/^[0-7]{4}$/.test(ssrCode) || existingSSR) {
        ssrInput.style.backgroundColor = '#f8d7da'; // Light red color for error
        return false;
    }

    ssrInput.style.backgroundColor = ''; // Reset to default
    return true;
}


function validateHeading() {
    const headingInput = document.getElementById('headingInput');
    const heading = parseInt(headingInput.value, 10);

    if (isNaN(heading) || heading < 1 || heading > 360) {
        headingInput.style.backgroundColor = '#f8d7da'; // Light red color
        return false;
    }

    headingInput.style.backgroundColor = ''; // Reset to default
    return true;
}

function validateSpeed() {
    const speedInput = document.getElementById('speedInput');
    const speed = parseInt(speedInput.value, 10);

    if (isNaN(speed)) {
        speedInput.style.backgroundColor = '#f8d7da'; // Light red color
        return false;
    }

    speedInput.style.backgroundColor = ''; // Reset to default
    return true;
}

function validateAltitude() {
    const altitudeInput = document.getElementById('altitudeInput');
    const altitude = parseInt(altitudeInput.value * 100, 10); // Convert to feet

    if (isNaN(altitude)) {
        altitudeInput.style.backgroundColor = '#f8d7da'; // Light red color
        return false;
    }

    altitudeInput.style.backgroundColor = ''; // Reset to default
    return true;
}


// Function to Create Aircraft blip after validating inputs from Dialog Box
function createAircraftBlip() {
    // Validate all fields before creating the aircraft
    const isCallsignValid = validateCallsign();
    const isSsrCodeValid = validateSsrCode();
    const isHeadingValid = validateHeading();
    const isSpeedValid = validateSpeed();
    const isAltitudeValid = validateAltitude();

    if (!isCallsignValid || !isSsrCodeValid || !isHeadingValid || !isSpeedValid || !isAltitudeValid) {
        // Prevent dialog from closing by returning false
        //alert('Please correct the highlighted fields.');
        return false;
    }

    // Get input values
    const callsignInput = document.getElementById('callsignInput');
    const ssrInput = document.getElementById('ssrInput');
    const headingInput = document.getElementById('headingInput');
    const speedInput = document.getElementById('speedInput');
    const altitudeInput = document.getElementById('altitudeInput');

    const callsign = callsignInput.value.trim();
    const ssrCode = ssrInput.value.trim(); // Read as string for validation
    const heading = parseInt(headingInput.value, 10);
    const speed = parseInt(speedInput.value, 10);
    const altitude = parseInt(altitudeInput.value * 100, 10);  // Convert to feet

    // Create the blip if all validations pass
    const blip = new AircraftBlip(callsign, heading, speed, altitude, selectedPosition.x, selectedPosition.y, ssrCode);
    aircraftBlips.push(blip);

    // Create the control box before any updates
    createControlBox(blip);

    // Return true to indicate successful creation
    return true;
}



// Create control box for aircraft
function createControlBox(blip) {
    const controlPanel = document.getElementById('controlPanel');
    const controlBox = document.createElement('div');
    controlBox.className = 'control-box';
    controlBox.id = `controlBox_${blip.callsign}`;  // Unique ID

    controlBox.innerHTML = `
        <div>
            <span class="info-box callsign-box">${blip.callsign}</span>
            <span class="info-box ssr-box">3-${blip.ssrCode}</span>
            <span class="info-box heading-box"><span id="heading_${blip.callsign}">${blip.heading}°</span></span>
            <span class="info-box altitude-box">A<span id="altitude_${blip.callsign}">${Math.round(blip.altitude / 100)}</span></span>
            <span class="info-box speed-box">N<span id="speed_${blip.callsign}">${blip.speed}</span></span>
        </div>
        <div class="command-input-container">
            <input type="text" id="commandInput_${blip.callsign}" placeholder="Enter command (e.g., L090, S350)">
            <span id="lastCommand_${blip.callsign}" class="last-command"></span>
        </div>
    `;

    controlPanel.appendChild(controlBox);

    // Event listener for Enter key
    controlBox.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            processCommand(blip);
        }
    });
}




// Function to update the speed and heading in the control box
function updateControlBox(blip) {
    const headingElement = document.getElementById(`heading_${blip.callsign}`);
    const speedElement = document.getElementById(`speed_${blip.callsign}`);
    const altitudeElement = document.getElementById(`altitude_${blip.callsign}`);
    const callsignElement = document.querySelector(`#controlBox_${blip.callsign} .callsign-box`);
    const ssrElement = document.querySelector(`#controlBox_${blip.callsign} .ssr-box`);

    // Update heading, speed, and altitude
    if (headingElement) headingElement.innerHTML = `${blip.heading}°`;
    if (speedElement) speedElement.innerHTML = `${blip.speed}`;
    if (altitudeElement) altitudeElement.innerHTML = `${Math.round(blip.altitude / 100)}`;

    // Update callsign and SSR code
    if (callsignElement) callsignElement.innerHTML = blip.callsign;
    if (ssrElement) ssrElement.innerHTML = `3-${blip.ssrCode}`;
}



// Cancel button logic
document.getElementById('cancelAircraftButton').addEventListener('click', closeAircraftDialog);

// Event listener for closing aircraft dialog through escape key
document.getElementById('aircraftDialog').addEventListener('keypress', (event) => {
    if (event.key === 'Escape') {
        closeAircraftDialog(); // Close the dialog when "Esc" is pressed
    }
});

// Event listener for creating aircraft from click on Create Button
document.getElementById('createAircraftButton').addEventListener('click', () => {
    if (createAircraftBlip()) {  // Attempt to create aircraft blip
        closeAircraftDialog();   // Close dialog if creation was successful
    }
});

// Event listener for creating aircraft from dialog or context menu
document.getElementById('aircraftDialog').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        if (createAircraftBlip()) {
            closeAircraftDialog();
        }
    }
});


// Context menu for creating aircraft
const radarContextMenu = document.getElementById('radarContextMenu');
let clickedPosition = { x: 0, y: 0 };

// Show the custom context menu on right-click
radarScope.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    clickedPosition = calculatePosition(event.clientX, event.clientY);
    radarContextMenu.style.top = `${event.clientY}px`;
    radarContextMenu.style.left = `${event.clientX}px`;
    radarContextMenu.style.display = 'block';
});

// Hide context menu when clicking elsewhere
document.addEventListener('click', () => {
    radarContextMenu.style.display = 'none';
});

// Handle "Create Aircraft" from context menu
document.getElementById('createAircraftContextMenu').addEventListener('click', () => {
    selectedPosition = { ...clickedPosition };
    openAircraftDialog();
    radarContextMenu.style.display = 'none';
});

// Update the radar center on pan or zoom
function updateRadarCenter() {
    radarCenter.x = radarScope.offsetWidth / 2;
    radarCenter.y = radarScope.offsetHeight / 2;
}

// Handle radar panning
function panRadar(dx, dy) {
    // Code to pan the radar
    panContainer.style.transform = `translate(${dx}px, ${dy}px)`;
    updateRadarCenter(); // Update center after panning
}

// Handle radar panning
function panRadar(dx, dy) {
    // Code to visually pan the radar
    panContainer.style.transform = `translate(${dx}px, ${dy}px)`;

    // Do not update radarCenter, as it should always refer to the original center
    // Keep radarCenter.x and radarCenter.y as the original, unpanned center
}


// Function to pause or resume the exercise
function togglePause() {
    const pauseButton = document.getElementById('pauseButton');
    const rangeRingsContainer = document.querySelector('.range-rings');
    isPaused = !isPaused;

    if (isPaused) {
        pauseButton.textContent = 'Resume';
        updateStatusBar('Exercise paused.');
        disableControlPanel();

        rangeRingsContainer.style.animationPlayState = 'paused'; // Stop radar rings rotation
    } else {
        pauseButton.textContent = 'Pause';
        updateStatusBar('Exercise resumed.');
        enableControlPanel();

        rangeRingsContainer.style.animationPlayState = 'running'; // Resume radar rings rotation

        moveAircraftBlips(); // Resume aircraft movements
    }
}

// Function to disable the control panel inputs
function disableControlPanel() {
    const inputs = document.querySelectorAll('#controlPanel input');
    inputs.forEach(input => {
        input.disabled = true;
    });
}

// Function to enable the control panel inputs
function enableControlPanel() {
    const inputs = document.querySelectorAll('#controlPanel input');
    inputs.forEach(input => {
        input.disabled = false;
    });
}

// Attach event listener to the pause button
document.getElementById('pauseButton').addEventListener('click', togglePause);




// Heading update interval set to 1 second (1000 milliseconds)
const headingUpdateInterval = 1000;  // Update every second

// Function to update the heading and control box every 1 second
function updateHeadingPeriodically() {
    aircraftBlips.forEach(blip => {
        blip.move(true);  // Only update the heading, not the position on the radar
    });

    setTimeout(updateHeadingPeriodically, headingUpdateInterval);  // Schedule next update
}

// Start the heading update loop
updateHeadingPeriodically();

// Function to update aircraft blips' positions every 4 seconds
function moveAircraftBlips() {
    if (!isPaused) {
        aircraftBlips.forEach(blip => blip.move(false));  // Update both heading and position
        setTimeout(moveAircraftBlips, updateInterval);  // Schedule next movement update
    }
}

// Start the movement update loop
moveAircraftBlips();



// To delete the aircraft
function deleteAircraft(blip) {
    // Remove the aircraft blip from the aircraftBlips array
    aircraftBlips = aircraftBlips.filter(b => b !== blip);

    // Remove the blip element from the DOM
    panContainer.removeChild(blip.element);

    // Remove the label element from the DOM
    panContainer.removeChild(blip.label);

    // Remove the line element from the DOM
    panContainer.removeChild(blip.line);

    // Remove the history dots
    blip.historyDots.forEach(dot => panContainer.removeChild(dot));

    // Remove the control box from the control panel
    const controlBox = document.getElementById(`controlBox_${blip.callsign}`);
    if (controlBox) {
        document.getElementById('controlPanel').removeChild(controlBox);
    }
}


// Calculate position based on radar's original center and panned position
function calculatePosition(clientX, clientY) {
    const rect = radarScope.getBoundingClientRect();

    // Get current pan offsets (dx, dy) from the panContainer
    const panMatrix = new WebKitCSSMatrix(window.getComputedStyle(panContainer).transform);
    const panX = panMatrix.m41;
    const panY = panMatrix.m42;

    // Calculate relative positions considering the panning
    const relativeX = (clientX - rect.left - radarCenter.x - panX) / zoomLevel;
    const relativeY = (radarCenter.y - (clientY - rect.top - panY)) / zoomLevel;

    return { x: relativeX, y: relativeY };
}


// Initialize the flag to track the visibility state of the history dots
let historyDotsVisible = true;

// Set the initial state of the History button
document.getElementById('historyDots').classList.add(historyDotsVisible ? 'active' : 'inactive');

// Toggle the visibility of history dots and update the button's appearance
document.getElementById('historyDots').addEventListener('click', () => {
    // Toggle the visibility state
    historyDotsVisible = !historyDotsVisible;

    // Get the history button element
    const historyButton = document.getElementById('historyDots');

    // Update the button's appearance based on the current state
    if (historyDotsVisible) {
        historyButton.classList.add('active');
        historyButton.classList.remove('inactive');
        updateStatusBar('History Dots Visible');
    } else {
        historyButton.classList.add('inactive');
        historyButton.classList.remove('active');
        updateStatusBar('History Dots Hidden');
    }

    // Immediately apply the visibility change by updating all blips
    aircraftBlips.forEach(blip => blip.updateHistoryDots());
});




//Initialize the flag to track the visibility state of the labels
let labelsVisible = true; // Initial state of label visibility

// Set the initial state of the Label button
document.getElementById('label').classList.add(labelsVisible ? 'active' : 'inactive');

// Toggle the visibility of labels and update the button's appearance


//Label button event listener
document.getElementById('label').addEventListener('click', () => {
    labelsVisible = !labelsVisible;

    // Get the label button element
    const labelButton = document.getElementById('label');

    // Update the button's appearance based on the current state
    if (labelsVisible) {
        labelButton.classList.add('active');
        labelButton.classList.remove('inactive');
        updateStatusBar('Labels Visible');
    } else {
        labelButton.classList.add('inactive');
        labelButton.classList.remove('active');
        updateStatusBar('Labels Hidden');
    }

    // Update visibility for all aircraft labels and lines
    aircraftBlips.forEach(blip => {
        if (blip.label) {
            blip.label.style.display = labelsVisible ? 'block' : 'none';
        }
        if (blip.line) {
            blip.line.style.display = labelsVisible ? 'block' : 'none';
        }
    });
});

// Aircraft Commands
function processCommand(blip) {
    const input = document.getElementById(`commandInput_${blip.callsign}`);
    const command = input.value.trim().toUpperCase();
    const headingMatch = command.match(/^([LR])(\d{3})$/);
    const speedMatch = command.match(/^S(\d+)$/);
    const altitudeMatch = command.match(/^H(\d{1,2})$/);
    const verticalRateMatch = command.match(/^V(\d+)$/);
    const ssrMatch = command.match(/^SSR([0-7]{4})$/); // SSR should be a 4-digit octal number

    // Handle heading command
    if (headingMatch) {
        const direction = headingMatch[1];
        const targetHeading = parseInt(headingMatch[2], 10);

        // Stop any ongoing orbit when a specific heading is given
        blip.orbitLeft = false;
        blip.orbitRight = false;

        let turnDirection = null;

        if (direction === 'L') {
            blip.turnRight = false;  // Turn left (counterclockwise)
            blip.setTargetHeading(targetHeading);
            turnDirection = `Left`;
        } else if (direction === 'R') {
            blip.turnRight = true;  // Turn right (clockwise)
            blip.setTargetHeading(targetHeading);
            turnDirection = `Right`;
        }

        updateStatusBar(`Aircraft ${blip.callsign} turning ${turnDirection} heading ${blip.targetHeading}°`);
    }

    // Handle speed command
    else if (speedMatch) {
        const speed = parseInt(speedMatch[1], 10);
        blip.setTargetSpeed(speed);  // Set target speed for gradual change
        updateStatusBar(`Aircraft ${blip.callsign} speed set to ${speed} knots.`);

        const speedElement = document.getElementById(`speed_${blip.callsign}`);
        //if (speedElement) {
           // speedElement.textContent = `N${blip.speed}`;  // Update speed in control box
        //}

        //blip.updateLabelInfo();  // Update label with new speed
    }

    // Handle altitude command
    else if (altitudeMatch) {
        const altitude = parseInt(altitudeMatch[1], 10) * 100;
        blip.targetAltitude = altitude;  // Set target altitude for gradual change
        updateStatusBar(`Aircraft ${blip.callsign} target altitude set to ${altitude} feet.`);

        const altitudeElement = document.getElementById(`altitude_${blip.callsign}`);
        //if (altitudeElement) {
           // altitudeElement.textContent = `${blip.targetAltitude / 100}`;  // Update altitude in control box
        //}
    }

    // Handle vertical climb/descent rate command
    else if (verticalRateMatch) {
        const rate = parseInt(verticalRateMatch[1], 10);
        blip.verticalClimbDescendRate = rate;  // Set vertical climb/descent rate
        updateStatusBar(`Aircraft ${blip.callsign} vertical rate set to ${rate} feet per minute.`);
    }

    //Handle SSR code changes commands
    else if (ssrMatch) {
        const newSSRCode = ssrMatch[1];  // Get the SSR code from the command

        // Allow duplication for 7500, 7600, and 7700
        if (newSSRCode !== '7500' && newSSRCode !== '7600' && newSSRCode !== '7700') {
            const existingSSR = aircraftBlips.find(blip => blip.ssrCode === newSSRCode);

            if (existingSSR && newSSRCode !== '0000') {
                updateStatusBar(`Duplicate SSR code. Aircraft ${existingSSR.callsign} already squawking ${existingSSR.ssrCode}`);
                return;
            }
        }

        // Update the aircraft's SSR code if it's not a duplicate or is an emergency code
        blip.setSSRCode(newSSRCode);
        updateStatusBar(`Aircraft ${blip.callsign} SSR code set to 3-${newSSRCode}`);
    }


    // Handle Report Heading command
    else if (command === "RH") {
        updateStatusBar(`Aircraft ${blip.callsign} heading: ${blip.heading}°`);
    }

    // Handle aircraft Delete command
    else if (command === "DEL") {
        deleteAircraft(blip);
        updateStatusBar(`Aircraft ${blip.callsign} deleted.`);
    }

    // Handle orbit left (OL) command
    else if (command === "OL") {
        blip.startOrbitLeft();
        updateStatusBar(`Aircraft ${blip.callsign} orbiting left.`);
    }

    // Handle orbit right (OR) command
    else if (command === "OR") {
        blip.startOrbitRight();
        updateStatusBar(`Aircraft ${blip.callsign} orbiting right.`);
    }

    // Handle stop turn (ST) command
    else if (command === "ST") {
        blip.stopTurn();
        updateStatusBar(`Aircraft ${blip.callsign} stopping turn.`);
    }

    //Handle invalid command
    else {
        updateStatusBar(`Invalid command: ${command}.`);
    }

    // Update last command display
    const lastCommandDisplay = document.getElementById(`lastCommand_${blip.callsign}`);
    lastCommandDisplay.textContent = `${command}`;

    input.value = '';  // Clear input after processing
}








