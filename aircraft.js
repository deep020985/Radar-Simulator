const updateInterval = 4000; // Update interval in milliseconds
const loggingInterval = 1000; // Logging interval in milliseconds

let selectedPosition = { x: 0, y: 0 }; // Initialize selectedPosition
let aircraftBlips = []; // To store all created aircraft blips
let radarCenter = { x: radarScope.offsetWidth / 2, y: radarScope.offsetHeight / 2 }; // Track radar center

class AircraftBlip {
    constructor(callsign, heading, speed, x, y) {
        this.callsign = callsign;
        this.heading = heading;
        this.speed = speed;
        this.position = { x, y };
        this.targetHeading = heading;
        this.headingChangeRate = 2; // Degrees per second
        this.element = this.createBlipElement();
        this.label = this.createLabelElement(); // Create label element
        this.line = this.createLineElement(); // Create leading line element
        this.history = [];
        this.historyDots = [];
        this.createHistoryDots();
        this.updateBlipPosition();

    }

    // Create the blip element for the aircraft
    createBlipElement() {
        const blip = document.createElement('div');
        blip.className = 'aircraft-blip';
        blip.style.width = '6px';
        blip.style.height = '6px';
        blip.style.backgroundColor = 'white';
        blip.style.position = 'absolute';
        blip.style.zIndex = '2';
        panContainer.appendChild(blip);
        return blip;
    }

    // Create the label element that displays callsign and speed
    createLabelElement() {
        const label = document.createElement('div');
        label.className = 'aircraft-label';
        label.innerHTML = `${this.callsign}<br>N${this.speed}`;
        label.style.position = 'absolute';
        label.style.color = 'goldenrod';
        label.style.zIndex = '3';
        panContainer.appendChild(label);
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
        panContainer.appendChild(line);
        return line;
    }

    // Create history dot elements and append to the radar
    createHistoryDots() {
        for (let i = 0; i < 20; i++) {
            const dot = document.createElement('div');
            dot.className = 'history-dot';
            dot.style.opacity = 0; // Initially set opacity to 0
            dot.style.position = 'absolute';
            dot.style.width = '1px';
            dot.style.height = '1px';
            dot.style.backgroundColor = 'white';
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
    updateLabelPosition() {
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

        // Update label content
        this.label.innerHTML = `${this.callsign}<br>${this.speed}kts`;
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
    move() {
        const speedMetersPerSecond = (this.speed / zoomLevel) * 0.514444;
        const distancePerUpdateMeters = speedMetersPerSecond * (updateInterval / 1000);
        const distancePerUpdateNauticalMiles = distancePerUpdateMeters / 1852;

        // Handle gradual heading change without shortest turn logic
        if (this.heading !== this.targetHeading) {
            let headingDiff = (this.targetHeading - this.heading + 360) % 360;

            // Check the direction of the turn
            const turnRate = this.headingChangeRate * (updateInterval / 1000);

            // If turnRight is true, the aircraft must turn right (clockwise), even if left is shorter
            // If turnRight is false, the aircraft must turn left (counterclockwise), even if right is shorter
            if (this.turnRight === true) {
                if (headingDiff > 180) {
                    headingDiff = 360 - headingDiff; // Force a longer right turn if shorter turn is left
                    this.heading = (this.heading + turnRate) % 360;
                } else {
                    this.heading = (this.heading + turnRate) % 360;
                }
            } else if (this.turnRight === false) {
                if (headingDiff <= 180) {
                    headingDiff = 360 - headingDiff; // Force a longer left turn if shorter turn is right
                    this.heading = (this.heading - turnRate + 360) % 360;
                } else {
                    this.heading = (this.heading - turnRate + 360) % 360;
                }
            }

            // Ensure heading wraps around between 0 and 360
            this.heading = (this.heading + 360) % 360;

            // If heading is close enough to the target heading, snap to target heading
            if (Math.abs(this.heading - this.targetHeading) <= turnRate) {
                this.heading = this.targetHeading;
            }
        }

        // Calculate movement based on the current heading
        const angleRad = (this.heading - 90) * Math.PI / 180;
        const deltaX = distancePerUpdateNauticalMiles * Math.cos(angleRad);
        const deltaY = distancePerUpdateNauticalMiles * Math.sin(angleRad);

        this.position.x += deltaX * zoomLevel;
        this.position.y -= deltaY * zoomLevel;

        // Update the blip's position on the radar
        this.updateBlipPosition();

        // Update the heading display in the control box as the aircraft turns
        updateControlBox(this);
    }

    // Set the target heading for a gradual turn
    setTargetHeading(newHeading) {
        this.targetHeading = newHeading;
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


// Create aircraft blip
function createAircraftBlip() {
    const callsign = document.getElementById('callsignInput').value.trim();
    const heading = parseInt(document.getElementById('headingInput').value, 10);
    const speed = parseInt(document.getElementById('speedInput').value, 10);


    // Check if callsign is already in use
    const existingBlip = aircraftBlips.find(blip => blip.callsign === callsign);
    if (existingBlip) {
        alert('Callsign already in use. Please choose a different callsign.');
        return;
    }

    if (!callsign || isNaN(heading) || isNaN(speed)) {
        alert('Please enter valid values.');
        return;
    }

    const blip = new AircraftBlip(callsign, heading, speed, selectedPosition.x, selectedPosition.y);
    aircraftBlips.push(blip);
    createControlBox(blip);
}

// Create control box for aircraft
function createControlBox(blip) {
    const controlPanel = document.getElementById('controlPanel');
    const controlBox = document.createElement('div');
    controlBox.className = 'control-box';
    controlBox.id = `controlBox_${blip.callsign}`;  // Give each control box a unique ID
    controlBox.innerHTML = `
        <div><b>${blip.callsign}</b>      Hdg: <span id="heading_${blip.callsign}">${blip.heading}</span>° <span id="speed_${blip.callsign}">${blip.speed}kts</span> </div>
        <input type="text" id="commandInput_${blip.callsign}" placeholder="Enter command (e.g., L090, S350)">
        <span id="lastCommand_${blip.callsign}" class="last-command"></span>
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
    document.getElementById(`heading_${blip.callsign}`).innerHTML = blip.heading;
}




// Event listener for creating aircraft from dialog or context menu
document.getElementById('aircraftDialog').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        createAircraftBlip();
        closeAircraftDialog();
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


// Move aircraft blips periodically
function moveAircraftBlips() {
    aircraftBlips.forEach(blip => blip.move());
    setTimeout(moveAircraftBlips, updateInterval);
}

// Start logging headings every second
// setInterval(logHeadings, loggingInterval);

moveAircraftBlips();

function logHeadings() {
    aircraftBlips.forEach(blip => {
        console.log(`Aircraft ${blip.callsign} heading: ${blip.heading}°`);
    });
}

// Aircraft Commands
function processCommand(blip) {
    const input = document.getElementById(`commandInput_${blip.callsign}`);
    const command = input.value.trim().toUpperCase();
    const headingMatch = command.match(/^([LR])(\d{3})$/);
    const speedMatch = command.match(/^S(\d+)$/);

    if (headingMatch) {
        const direction = headingMatch[1];
        const targetHeading = parseInt(headingMatch[2], 10);
        let turnDirection = null;

        // Set target heading based on direction
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
    } else if (speedMatch) {
        const speed = parseInt(speedMatch[1], 10);
        blip.speed = speed;
        updateStatusBar(`Aircraft ${blip.callsign} speed set to ${speed} knots.`);
        // Update the speed in the control box
        document.getElementById(`speed_${blip.callsign}`).innerHTML = `      ${blip.speed}kts`;
    } else if (command === "RH") {
        // Print the current heading to the console and status bar
        //console.log(`Aircraft ${blip.callsign} heading: ${blip.heading}°`);
        updateStatusBar(`Aircraft ${blip.callsign} heading: ${blip.heading}°`);
    } else {
        updateStatusBar(`Invalid command: ${command}.`);
    }

    // Update the last command display
    const lastCommandDisplay = document.getElementById(`lastCommand_${blip.callsign}`);
    lastCommandDisplay.textContent = ` ${command}`;

    input.value = ''; // Clear the input after processing
}

// Calculate position based on radar center
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





