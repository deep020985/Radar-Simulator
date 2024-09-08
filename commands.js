//Commands
// RH : Report Heading
// R090 or L090: Turn Right or Left Heading 090
// H20: To climb or descend to 2000 ft
// V4000: To set the rate of climb/descend to 4000 ft per minute
// S600: To set the speed to 600 knots
// DEl: To delete the aircraft
// SSR1000: Set the squawk code to 1000

// Initialize the SpeechRecognition API
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true; // Keep recognizing as long as the user is speaking
recognition.interimResults = false; // Don't show intermediate results

// Start recognition when the page loads
recognition.start();

// Event handler for when speech recognition starts
recognition.onstart = () => {
    console.log('Speech recognition started');
};

// Event handler for when speech is recognized
recognition.onresult = (event) => {
    const results = event.results;
    const command = results[results.length - 1][0].transcript.toLowerCase().trim();
    console.log('Controller: ' + command);
    updateStatusBar('Radar: ' + command);

    // Handle the recognized command
    handleVoiceCommand(command);
};

// Event handler for errors
recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    restartRecognition(); // Restart recognition on error
};

// Event handler for when speech recognition ends
recognition.onend = () => {
    console.log('Speech recognition ended');
    restartRecognition(); // Restart recognition when it ends
};

// Function to restart speech recognition
function restartRecognition() {
    // Stop and then start recognition
    recognition.stop();
    setTimeout(() => {
        recognition.start();
    }, 1000); // Wait for 1 second before restarting
}

// Flag to track if speech synthesis has been activated
let speechActivated = true;

// Function to activate speech synthesis
document.getElementById('activateSpeech').addEventListener('click', () => {
    speechActivated = true;
    document.getElementById('activateSpeech').style.display = 'none'; // Hide the button after activation
});

// Function to speak out a message
function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = 'en-US';
    speechSynthesis.speak(speech);
}

// Function to handle voice command
function handleVoiceCommand(command) {
    if (!speechActivated) {
        console.log('Speech synthesis not activated');
        return;
    }

    // Normalize command and trim spaces
    const normalizedCommand = command.toLowerCase().trim();
    console.log('Normalized command:', normalizedCommand);

    // Extract heading if present
    const headingMatch = normalizedCommand.match(/(\d{3})/);
    const heading = headingMatch ? headingMatch[1] : null;

    if (normalizedCommand.includes('report heading')) {
        // No heading is needed for this command
        const currentHeading = aircraftDirection ? aircraftDirection.toFixed(0).padStart(3, '0') : '000'; // Get the current heading of the aircraft
        const message = `Heading ${currentHeading}`;
        speak(message);
        updateStatusBar('Pilot: ' + message); // Update status bar with the spoken message
    } else if (normalizedCommand.includes('turn right heading') && heading) {
        const message = `Roger, Turning Right Heading ${heading}`;
        speak(message);
        updateStatusBar('Pilot: ' + message);
        turnAircraft('right', heading); // Function to turn aircraft to the specified heading
    } else if (normalizedCommand.includes('turn left heading') && heading) {
        const message = `Roger, Turning Left Heading ${heading}`;
        speak(message);
        updateStatusBar('Pilot: ' + message);
        turnAircraft('left', heading); // Function to turn aircraft to the specified heading
    } else if (normalizedCommand.includes('make heading') && heading) {
        const message = `Roger, Heading ${heading}`;
        speak(message);
        updateStatusBar('Pilot: ' + message);
        setAircraftHeading(heading); // Function to set aircraft to the specified heading
    } else {
        speak('Say again');
        updateStatusBar('Pilot: Say Again');
    }
}

// Function to turn the aircraft
function turnAircraft(direction, heading) {
    // Logic to turn the aircraft in the specified direction to the given heading
    console.log(`Pilot: Turning ${direction} to heading ${heading}`);
    // Implement turning logic here
}

// Function to set the aircraft heading
function setAircraftHeading(heading) {
    // Logic to set the aircraft's heading
    console.log(`Pilot: Setting heading to ${heading}`);
    // Implement heading setting logic here
}

// Ensure aircraftDirection is defined elsewhere in your code
//let aircraftDirection = 0; // Example initialization
// Aircraft Commands
function processCommand(blip) {
    const input = document.getElementById(`commandInput_${blip.callsign}`);
    const command = input.value.trim().toUpperCase();
    const headingMatch = command.match(/^([LR])(\d{3})$/);
    const speedMatch = command.match(/^S(\d+)$/);
    const altitudeMatch = command.match(/^H(\d{1,2})$/);  // Match H<number> for altitude in 100s of feet
    const verticalRateMatch = command.match(/^V(\d+)$/);  // Match V<number> for vertical rate

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
        document.getElementById(`speed_${blip.callsign}`).innerHTML = `N${blip.speed}`;  // Update speed in control box
        blip.updateLabelPosition();  // Update label with new speed
    } else if (altitudeMatch) {
        const altitude = parseInt(altitudeMatch[1], 10) * 100;
        blip.targetAltitude = altitude;  // Set target altitude for gradual change
        updateStatusBar(`Aircraft ${blip.callsign} target altitude set to ${altitude} feet.`);
    } else if (verticalRateMatch) {
        const rate = parseInt(verticalRateMatch[1], 10);
        blip.verticalClimbDescendRate = rate;  // Set vertical climb/descent rate
        updateStatusBar(`Aircraft ${blip.callsign} vertical rate set to ${rate} feet per minute.`);
    } else if (command === "RH") {
        // Print the current heading to the console and status bar
        //console.log(`Aircraft ${blip.callsign} heading: ${blip.heading}°`);
        updateStatusBar(`Aircraft ${blip.callsign} heading: ${blip.heading}°`);
    } else {
        updateStatusBar(`Invalid command: ${command}.`);
    }

    // Update last command display
    const lastCommandDisplay = document.getElementById(`lastCommand_${blip.callsign}`);
    lastCommandDisplay.textContent = `${command}`;

    input.value = '';  // Clear input after processing
}


