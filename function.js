// Function to start scheduling
function startScheduling(inputJson) {
  // Retrieve input JSON from the text area
  //  const inputJson = document.getElementById("inputJson").value;
  const data = inputJson;

  // Initialize the variables
  const timeout = parseInt(data.TIMEOUT) * 1000; // Convert timeout to milliseconds
  const allowMultipleMatchesPerDay = data.DOZVOLI_IGRACU_VISE_MECEVA_U_ISTOM_DANU === "true";
  const priorities = data.PRIORITETI;
  const clubTimeslots = data.TERMINI_KLUBA;
  const players = data.IGRACI;

  const koef_MINJEDANMEC = GetKoeficientForPriority("10", inputJson);
  const koef_MAXMECEVA = GetKoeficientForPriority("20", inputJson);
  const koef_JUTARNJI = GetKoeficientForPriority("30", inputJson);
  const koef_MAXPREOSTALI = GetKoeficientForPriority("40", inputJson);
  const koef_MAXPRIJAVLJENIH = GetKoeficientForPriority("50", inputJson);

  // Convert club timeslots into a more usable format
  const courtAvailabilities = clubTimeslots.reduce((acc, slot) => {
    const key = `${slot.dan}-${slot.sat}`;
    if (!acc[key]) {
      acc[key] = []; // Initialize array for this timeslot if not already initialized
    }
    acc[key].push(slot.teren); // Add court to the timeslot
    return acc;
  }, {}); // End of reduce

  const countClubMorningTimeslotsTotalInInputJson = Object.keys(courtAvailabilities)
    .filter((timeslotKey) => parseInt(timeslotKey.split("-")[1]) < 12)
    .reduce((acc, key) => acc + courtAvailabilities[key].length, 0);

  const totalPreostalihForAllPlayers = CalculateTotalPreostalihForAllPlayers(inputJson);
  const totalPrijavlenihTerminaForAllPlayers = CalculateTotalPrijavljenihTerminaForAllPlayers(inputJson);

  // Initialize all possible combinations and the best combination
  const allPossibleCombinations = [];
  const combinationLengthCount = {};
  let bestCombination = null;
  let bestCombinationScore = 0;
  let lastUpdate = Date.now(); // Track the last time the HTML was updated
  let courtsOfferedByClub = CountCourtsOfferedByClub(inputJson);

  // Function to check if all matches are scheduled
  function allMatchesScheduled(currentCombination, players) {
    const playerMatches = new Map(players.map((player) => [player.PLAYER_ID, 0]));
    for (const match of currentCombination) {
      playerMatches.set(match.player1, playerMatches.get(match.player1) + 1);
      playerMatches.set(match.player2, playerMatches.get(match.player2) + 1);
    } // End of for loop
    for (const [player, count] of playerMatches.entries()) {
      if (count > parseInt(players.find((p) => p.PLAYER_ID === player).ZELI_IGRATI_MECEVA)) {
        return false; // A player has more matches scheduled than they wanted
      } // End of if
    } // End of for loop
    return true; // All players have their desired number of matches
  } // End of allMatchesScheduled function

  // Function to get potential opponents for a player
  function getPotentialOpponents(player, players) {
    return players.filter((p) => player.POTENCIJALNI_PROTIVNICI.includes(p.PLAYER_ID)); // Return list of potential opponents
  } // End of getPotentialOpponents function

  // Function to check if a match is already scheduled
  function matchAlreadyScheduled(player1, player2, currentCombination) {
    return currentCombination.some(
      (match) => (match.player1 === player1.PLAYER_ID && match.player2 === player2.PLAYER_ID) || (match.player1 === player2.PLAYER_ID && match.player2 === player1.PLAYER_ID)
    ); // Return true if match is already scheduled
  } // End of matchAlreadyScheduled function

  // Function to check if a player can play in a timeslot
  function canPlayInTimeslot(player, timeslot) {
    return player.TERMINI_IGRACA.some((slot) => slot.dan === timeslot.dan && slot.sat === timeslot.sat); // Return true if player prefers this timeslot
  } // End of canPlayInTimeslot function

  // Function to check if a player has reached their max matches per week
  function canPlayMoreMatches(player, currentCombination) {
    const playerMatches = currentCombination.filter((match) => match.player1 === player.PLAYER_ID || match.player2 === player.PLAYER_ID).length;
    return playerMatches < parseInt(player.ZELI_IGRATI_MECEVA); // Return true if player can play more matches
  } // End of canPlayMoreMatches function

  // Function to check if a player or its opponent already have a match scheduled on the same day
  function hasMatchOnSameDay(player, opponent, timeslot, currentCombination) {
    return currentCombination.some(
      (match) =>
        match.timeslot.dan === timeslot.dan &&
        (match.player1 === player.PLAYER_ID || match.player2 === player.PLAYER_ID || match.player1 === opponent.PLAYER_ID || match.player2 === opponent.PLAYER_ID)
    ); // Return true if player or opponent has a match on the same day
  } // End of hasMatchOnSameDay function

  // Function to check if a player or its opponent already have a match scheduled at the same timeslot
  function hasMatchAtSameTime(player, opponent, timeslot, currentCombination) {
    return currentCombination.some(
      (match) =>
        match.timeslot.dan === timeslot.dan &&
        match.timeslot.sat === timeslot.sat &&
        (match.player1 === player.PLAYER_ID || match.player2 === player.PLAYER_ID || match.player1 === opponent.PLAYER_ID || match.player2 === opponent.PLAYER_ID)
    ); // Return true if player or opponent has a match at the same timeslot
  } // End of hasMatchAtSameTime function

  // Function to update the number of found combinations on the HTML page
  //  function updateCombinationsCount(
  //       allPossibleCombinations,
  //       combinationLengthCount
  //  ) {
  //       const combinationsCountDiv =
  //            document.getElementById("combinationsCount");
  //       combinationsCountDiv.innerHTML = `Number of found combinations: ${allPossibleCombinations.length}<br>`;
  //       for (const [length, count] of Object.entries(
  //            combinationLengthCount
  //       )) {
  //            combinationsCountDiv.innerHTML += `Combinations of length ${length}: ${count}<br>`;
  //       } // End of for
  //  } // End of updateCombinationsCount function

  // Function to update the timeout display on the HTML page
  //  function updateTimeoutDisplay(startTime, timeout) {
  //       const elapsed = Math.floor((Date.now() - startTime) / 1000);
  //       const remaining = timeout / 1000 - elapsed;
  //       document.getElementById(
  //            "timeoutDisplay"
  //       ).innerText = `Timeout: ${remaining} seconds remaining`;
  //       console.log(remaining);
  //  } // End of updateTimeoutDisplay function

  // Function to get the coefficient for a given priority name from the input JSON
  function GetKoeficientForPriority(id, inputJson) {
    // Parse the input JSON to get the data object
    const data = inputJson;

    // Find the priority object that matches the given priority name
    const priorityObject = data.PRIORITETI.find((priority) => priority.id === id);

    // If the priority object is found, convert its priority value to a float and return it
    if (priorityObject) {
      return parseFloat(priorityObject.priority);
    }

    // If the priority object is not found, return null or an appropriate default value
    return null;
  }

  // Function to calculate the score for the criterion "Svaki igrač min 1 meč"
  function Score_SvakiIgracJedanMec(currentCombination, players, koef_MINJEDANMEC) {
    // Create a set to store distinct player IDs from the current combination of matches
    if (players.length == 0) return 0;

    const distinctPlayers = new Set();

    // Iterate through each match in the current combination
    currentCombination.forEach((match) => {
      // Add both player1 and player2 IDs to the set of distinct players
      distinctPlayers.add(match.player1);
      distinctPlayers.add(match.player2);
    });

    // Calculate the score: number of distinct players divided by the total number of players, multiplied by the coefficient
    const score = (distinctPlayers.size / players.length) * koef_MINJEDANMEC;

    // Return the calculated score
    return score;
  }

  // Function to count the total number of offered club timeslots and courts from the input JSON
  function CountCourtsOfferedByClub(inputJson) {
    // Parse the input JSON to get the data object
    const data = inputJson;

    // Count and return the length of the TERMINI_KLUBA array, which represents the total number of offered courts
    return data.TERMINI_KLUBA.length;
  }

  // Function to calculate the total count of preostalih meceva for all players from the input JSON
  function CalculateTotalPreostalihForAllPlayers(inputJson) {
    // Parse the input JSON to get the data object
    const data = inputJson;

    // Sum the PREOSTALO_MECEVA property for all players
    const totalCountOfPreostalihMeceva = data.IGRACI.reduce((acc, player) => acc + parseInt(player.PREOSTALO_MECEVA), 0);

    // Return the total count of preostalih meceva
    return totalCountOfPreostalihMeceva;
  }

  // Function to calculate the score for the criterion "Jutarnji termini"
  function Score_Jutarnji(currentCombination, countMorningSlotsInClub, koef_JUTARNJI) {
    if (countMorningSlotsInClub == 0) return 0;

    // Count the morning timeslots found in the current combination (timeslot.sat < 12)
    const countMorningTimeSlotsFoundinCurrentCombination = currentCombination.filter((match) => parseInt(match.timeslot.sat) < 12).length;

    // Count the total number of morning timeslots offered by the club (timeslot.sat < 12)

    // Calculate the score using the provided formula
    const score = (countMorningTimeSlotsFoundinCurrentCombination / countMorningSlotsInClub) * koef_JUTARNJI;

    // Return the calculated score
    return score;
  }

  // Function to calculate the score for the criterion "Max broj mečeva"
  function Score_MaxMeceva(currentCombination, courtsOfferedByClub, koef_MAXMECEVA) {
    if (courtsOfferedByClub == 0) return 0;

    // Calculate the score as the number of matches in the current combination divided by the total number of offered courts
    const score = (currentCombination.length / courtsOfferedByClub) * koef_MAXMECEVA;

    // Return the calculated score
    return score;
  }

  // Function to calculate the score for the criterion "Max preostalih mečeva"
  function Score_MaxPreostalihMeceva(currentCombination, players, totalPreostalihForAllPlayers, koef_MAXPREOSTALI) {
    if (totalPreostalihForAllPlayers == 0) return 0;

    // Create a set to store distinct player IDs from the current combination of matches
    const distinctPlayers = new Set();

    // Iterate through each match in the current combination
    currentCombination.forEach((match) => {
      // Add both player1 and player2 IDs to the set of distinct players
      distinctPlayers.add(match.player1);
      distinctPlayers.add(match.player2);
    });

    // Calculate the total count of remaining matches (preostalih meceva) for distinct players
    const totalPreostalihMeceva = Array.from(distinctPlayers).reduce((acc, playerId) => {
      const player = players.find((p) => p.PLAYER_ID === playerId);
      return acc + (player ? parseInt(player.PREOSTALO_MECEVA) : 0);
    }, 0);

    // Calculate the score using the provided formula
    const score = (totalPreostalihMeceva / totalPreostalihForAllPlayers) * koef_MAXPREOSTALI;

    // Return the calculated score
    return score;
  }

  // Function to calculate the total sum of prijavljenih termina for all players from the input JSON
  function CalculateTotalPrijavljenihTerminaForAllPlayers(inputJson) {
    // Parse the input JSON to get the data object
    const data = inputJson;

    // Sum the PRIJAVLJENIH_TERMINA property for all players
    const totalPrijavljenihTermina = data.IGRACI.reduce((acc, player) => acc + (player.TERMINI_IGRACA ? player.TERMINI_IGRACA.length : 0), 0);

    // Return the total sum of prijavljenih termina
    return totalPrijavljenihTermina;
  }

  // Function to calculate the score for the criterion "Prijavljenih termina"
  function Score_PrijavljenihTermina(currentCombination, players, totalPrijavlenihTerminaForAllPlayers, koef_MAXPRIJAVLJENIH) {
    if (totalPrijavlenihTerminaForAllPlayers == 0) return 0;

    // Create a set to store distinct player IDs from the current combination of matches
    const distinctPlayers = new Set();

    // Iterate through each match in the current combination
    currentCombination.forEach((match) => {
      // Add both player1 and player2 IDs to the set of distinct players
      distinctPlayers.add(match.player1);
      distinctPlayers.add(match.player2);
    });

    // Calculate the sum of prijavljenih termina for distinct players
    const sumPrijavljenihTermina = Array.from(distinctPlayers).reduce((acc, playerId) => {
      const player = players.find((p) => p.PLAYER_ID === playerId);
      return acc + (player ? (player.TERMINI_IGRACA ? player.TERMINI_IGRACA.length : 0) : 0);
    }, 0);

    // Calculate the score using the provided formula
    const score = (sumPrijavljenihTermina / totalPrijavlenihTerminaForAllPlayers) * koef_MAXPRIJAVLJENIH;

    // Return the calculated score
    return score;
  }

  // Backtracking function to explore all possible match combinations
  function backtrack(currentCombination, players, courtAvailabilities, allPossibleCombinations, combinationLengthCount, startTime, timeout) {
    // Update the timeout display
    //   updateTimeoutDisplay(startTime, timeout);

    // Check if the elapsed time has exceeded the timeout
    if (Date.now() - startTime > timeout) {
      return; // End of timeout check
    } // End of if (timeout check)

    // Check if we should add the current combination to allPossibleCombinations
    if (currentCombination.length > 0 && allMatchesScheduled(currentCombination, players)) {
      const score1 = Score_MaxMeceva(currentCombination, courtsOfferedByClub, koef_MAXMECEVA);
      const score2 = Score_SvakiIgracJedanMec(currentCombination, players, koef_MINJEDANMEC);
      const score3 = Score_Jutarnji(currentCombination, countClubMorningTimeslotsTotalInInputJson, koef_JUTARNJI);
      const score4 = Score_MaxPreostalihMeceva(currentCombination, players, totalPreostalihForAllPlayers, koef_MAXPREOSTALI);
      const score5 = Score_PrijavljenihTermina(currentCombination, players, totalPrijavlenihTerminaForAllPlayers, koef_MAXPRIJAVLJENIH);

      let currentCombinationScore = score1 + score2 + score3 + score4 + score5;

      if (currentCombinationScore > bestCombinationScore) {
        bestCombinationScore = currentCombinationScore;
        bestCombination = currentCombination;

        allPossibleCombinations.pop();
        allPossibleCombinations.push([...currentCombination]);
      }

      //allPossibleCombinations.push([...currentCombination]);

      const length = currentCombination.length;
      combinationLengthCount[length] = (combinationLengthCount[length] || 0) + 1;
    } // End of if (currentCombination.length > 0 && allMatchesScheduled)

    // Update the display every 10 seconds
    //   if (Date.now() - lastUpdate > 10000) {
    //        updateCombinationsCount(
    //             allPossibleCombinations,
    //             combinationLengthCount
    //        );
    //        lastUpdate = Date.now();
    //   } // End of if (Date.now() - lastUpdate > 10000)

    // Loop through all players
    for (const player1 of players) {
      // Check if player1 can play more matches
      if (!canPlayMoreMatches(player1, currentCombination)) continue;

      // Loop through potential opponents for player1
      for (const player2 of getPotentialOpponents(player1, players)) {
        // Check if player2 can play more matches
        if (!canPlayMoreMatches(player2, currentCombination)) continue;

        // Check if the match between player1 and player2 is already scheduled if allowMultipleMatchesPerDay is false
        if (!matchAlreadyScheduled(player1, player2, currentCombination)) {
          // Loop through available time slots
          for (const timeslotKey in courtAvailabilities) {
            const [day, hour] = timeslotKey.split("-");
            const timeslot = { dan: day, sat: hour };

            // Check if the time slot is preferred by both players and if they can play multiple matches in the same day
            if (
              canPlayInTimeslot(player1, timeslot) &&
              canPlayInTimeslot(player2, timeslot) &&
              !hasMatchAtSameTime(player1, player2, timeslot, currentCombination) &&
              (allowMultipleMatchesPerDay || !hasMatchOnSameDay(player1, player2, timeslot, currentCombination))
            ) {
              // Allocate a court for the match
              const availableCourts = courtAvailabilities[timeslotKey];
              if (availableCourts.length > 0) {
                const court = availableCourts.shift(); // Allocate the first available court

                // Schedule the match
                currentCombination.push({
                  player1: player1.PLAYER_ID,
                  player2: player2.PLAYER_ID,
                  timeslot,
                  court,
                });

                // Recur to the next step
                backtrack(currentCombination, players, courtAvailabilities, allPossibleCombinations, combinationLengthCount, startTime, timeout);

                // Backtrack: Undo the last match assignment and return the court
                currentCombination.pop();
                availableCourts.push(court);
              } // End of if (availableCourts.length > 0)
            } // End of if (canPlayInTimeslot)
          } // End of timeslot loop
        } // End of if (!matchAlreadyScheduled)
      } // End of opponent loop
    } // End of player loop
  } // End of backtrack function

  // Start the backtracking process
  const startTime = Date.now(); // Record the start time
  const currentCombination = []; // Initialize the current combination

  backtrack(currentCombination, players, courtAvailabilities, allPossibleCombinations, combinationLengthCount, startTime, timeout);

  // Function to generate output JSON after backtracking
  function generateOutputJson(players, bestCombination, clubTimeslots) {
    const specifiedTimeslots = new Set(clubTimeslots.map((slot) => `${slot.dan}-${slot.sat}`)).size;

    const output = {
      players: [],
      club: {
        specifiedTimeslots: specifiedTimeslots,
        specifiedCourts: clubTimeslots.length,
        usedTimeslots: new Set(bestCombination.map((match) => `${match.timeslot.dan}-${match.timeslot.sat}`)).size,
        usedCourts: bestCombination.length,
      },
    };

    players.forEach((player) => {
      const potentialMatches = Math.min(parseInt(player.ZELI_IGRATI_MECEVA), player.POTENCIJALNI_PROTIVNICI.length);
      const playedMatches = bestCombination.filter((match) => match.player1 === player.PLAYER_ID || match.player2 === player.PLAYER_ID).length;
      output.players.push({
        playerID: player.PLAYER_ID,
        potentialMatches,
        playedMatches,
      });
    });

    return JSON.stringify(output, null, 2); // Return the output JSON as a formatted string
  }

  // Function to generate matches JSON after backtracking
  function generateMatchesJson(bestCombination) {
    const matches = bestCombination.map((match) => ({
      player1ID: match.player1,
      player2ID: match.player2,
      terenID: match.court,
      dan: match.timeslot.dan,
      sat: match.timeslot.sat,
    }));
    return JSON.stringify(matches, null, 2); // Return the matches JSON as a formatted string
  }

  // Display final results
  //  const resultsDiv = document.getElementById("results");
  //  updateCombinationsCount(allPossibleCombinations, combinationLengthCount); // Final update
  //  resultsDiv.innerHTML = `All possible combinations: ${allPossibleCombinations.length}<br>`;

  // Check for timeout
  //  if (Date.now() - startTime > timeout) {
  //       resultsDiv.innerHTML +=
  //            "Algorithm finished execution due to timeout.<br>";
  //  } else {
  //       resultsDiv.innerHTML +=
  //            "Algorithm finished execution successfully.<br>";
  //  } // End of if-else (timeout check)

  // Find the combination with the most matches
  if (allPossibleCombinations.length > 0) {
    bestCombination = allPossibleCombinations.reduce((best, current) => (current.length > best.length ? current : best), []);
  }

  //       resultsDiv.innerHTML += `Best combination has ${bestCombination.length} matches.<br>`;

  //       // Display the best combination in a table
  //       const table = document.createElement("table");
  //       const headerRow = table.insertRow();
  //       ["Player 1", "Player 2", "Day", "Hour", "Court"].forEach((text) => {
  //            const cell = headerRow.insertCell();
  //            cell.textContent = text;
  //       }); // End of forEach (table headers)
  //       bestCombination.forEach((match) => {
  //            const row = table.insertRow();
  //            row.insertCell().textContent = match.player1;
  //            row.insertCell().textContent = match.player2;
  //            row.insertCell().textContent = match.timeslot.dan;
  //            row.insertCell().textContent = match.timeslot.sat;
  //            row.insertCell().textContent = match.court;
  //       }); // End of forEach (bestCombination rows)
  //       resultsDiv.appendChild(table);

  //       // Generate and display the output JSON
  const outputJson = generateOutputJson(players, bestCombination, clubTimeslots);
  // document.getElementById("outputJson").innerText = outputJson;

  // Generate and display the matches JSON
  // const matchesJson = generateMatchesJson(bestCombination);
  // document.getElementById("matchesJson").innerText = matchesJson;
  //  } else {
  //       resultsDiv.innerHTML += "No valid combinations found.<br>";
  //  } // End of if-else (best combination check)

  let bestCombinationOutput = [];
  if (bestCombination) {
    allPossibleCombinations[0].forEach((item) => {
      bestCombinationOutput.push({
        player1Id: item.player1,
        player2Id: item.player2,
        courtID: item.court,
        dayPlayed: item.timeslot.dan,
        hourPlayed: item.timeslot.sat,
      });
    });
    const obj = { pocetakAlgoritmaTimeStamp: startTime, krajAlgoritmaTimeStamp: Date.now() };
    bestCombinationOutput.push(obj);
    bestCombinationOutput.push(JSON.parse(outputJson));
  }

  return bestCombinationOutput;
} // End of startScheduling function

async function setData(data) {
  const startTime = Date.now();
  if (data == "") {
    return "" + startTime;
  } else if (!data) {
    return "data is null";
  } else if (!data || typeof data !== "object") {
    return "Invalid JSON data format: Data is not a valid JSON object.";
  } else if (!data.IGRACI) {
    return "IGRACI in data is null";
  } else if (!data.TERMINI_KLUBA) {
    return "TERMINI_KLUBA in data is null";
  } else if (!data.PRIORITETI) {
    return "PRIORITETI in data is null";
  }
  let bestCombination = await startScheduling(data);
  //   console.log("bestCombination", bestCombination);

  // let bestCombinationOutput = [];

  // if (bestCombination) {
  //   bestCombination[0].forEach((item) => {
  //     bestCombinationOutput.push({
  //       player1Id: item.player1,
  //       player2Id: item.player2,
  //       courtID: item.court,
  //       dayPlayed: item.timeslot.dan,
  //       hourPlayed: item.timeslot.sat,
  //     });
  //   });
  //   const obj = { pocetakAlgoritmaTimeStamp: startTime, krajAlgoritmaTimeStamp: Date.now() };
  // bestCombinationOutput.push(obj);
  // }

  if (!bestCombination) {
    bestCombination = "no data";
  }
  console.log("bestCombination", bestCombination);
  return bestCombination;
}

const dev = 1;

if (dev === 0) {
  fetch("./data9.json")
    .then((response) => response.json())
    .then((json) => setData(json));
}

if (dev === 1) {
  window.function = async function (text) {
    if (text.value == "") {
      return "" + Date.now().toString();
    }
    let json = JSON.parse(text.value);

    // Provera da li je JSON objekat validan
    if (!json || typeof json !== "object") {
      return "Invalid JSON data format: Data is not a valid JSON object.";
    }

    // Provera ostalih neophodnih delova JSON-a
    if (!json.IGRACI || !Array.isArray(json.IGRACI) || !json.TERMINI_KLUBA || !Array.isArray(json.TERMINI_KLUBA) || !json.PRIORITETI || !Array.isArray(json.PRIORITETI)) {
      return "Invalid JSON data format: Missing player information, club slots, or priorities.";
    }

    let result = await setData(json);
    let senddata = await JSON.stringify(result);
    return await senddata.toString();
  };
}

const defaultJson = {
  TIMEOUT: "60",
  DOZVOLI_IGRACU_VISE_MECEVA_U_ISTOM_DANU: "true",
  PRIORITETI: [
    { id: "50", name: "Max prijavljenih termina", priority: "15.00" },
    { id: "40", name: "Max preostalih mečeva", priority: "40.00" },
    { id: "20", name: "Max broj mečeva", priority: "80.00" },
    { id: "30", name: "Jutarnji termini", priority: "90.00" },
    { id: "10", name: "Svaki igrač min 1 meč", priority: "100.00" },
  ],
  TERMINI_KLUBA: [
    { dan: "1", sat: "8", teren: "vIMfQHxSaJFU8ogpAr0v" },
    { dan: "1", sat: "8", teren: "Zk6uhkn9YXzh123c7Pra" },
    { dan: "1", sat: "8", teren: "BG4G07LVpEvs5c9Bc3SI" },
    { dan: "1", sat: "8", teren: "lWF4yvK8RwWtQ9OUZg2LXw" },
  ],
  IGRACI: [
    {
      PLAYER_ID: "a5d0HdEoSeKAewEGYjB1tw",
      PLAYER_NAME: "Darko",
      ZELI_IGRATI_MECEVA: "2",
      PREOSTALO_MECEVA: "10",
      TERMINI_IGRACA: [
        { dan: "1", sat: "8" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "tHGxFNjDQl2YkPd0ga2ZYQ",
        "Od9fmlcnSvWKXjhr9WrJpQ",
        "dnDEeNNPQNyEhCGpaAyBhQ",
        "NEpViJIiTcmloNcihgkANQ",
        "NvMXMjOdQ1S6yUzHdLDbUA",
        "a-y0ruSKNQguwK-4x5.VUyQ",
        "KUX3GnypTESueDzNkM-iig",
        "JZpkbnTXQOKctUYhoLM4TQ",
      ],
    },
    {
      PLAYER_ID: "KUX3GnypTESueDzNkM-iig",
      PLAYER_NAME: "Djurdje Milenkovic",
      ZELI_IGRATI_MECEVA: "1",
      PREOSTALO_MECEVA: "11",
      TERMINI_IGRACA: [
        { dan: "1", sat: "14" },
        { dan: "1", sat: "8" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "dnDEeNNPQNyEhCGpaAyBhQ",
        "NEpViJIiTcmloNcihgkANQ",
        "NvMXMjOdQ1S6yUzHdLDbUA",
        "LDY-2YUXQj2feUUgE57xQw",
        "tHGxFNjDQl2YkPd0ga2ZYQ",
        "Od9fmlcnSvWKXjhr9WrJpQ",
        "a-y0ruSKNQguwK-4x5.VUyQ",
        "JZpkbnTXQOKctUYhoLM4TQ",
        "a5d0HdEoSeKAewEGYjB1tw",
      ],
    },
    {
      PLAYER_ID: "dnDEeNNPQNyEhCGpaAyBhQ",
      PLAYER_NAME: "Goran Vukojičić ",
      ZELI_IGRATI_MECEVA: "1",
      PREOSTALO_MECEVA: "11",
      TERMINI_IGRACA: [
        { dan: "1", sat: "14" },
        { dan: "1", sat: "8" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "tHGxFNjDQl2YkPd0ga2ZYQ",
        "LDY-2YUXQj2feUUgE57xQw",
        "Od9fmlcnSvWKXjhr9WrJpQ",
        "NEpViJIiTcmloNcihgkANQ",
        "NvMXMjOdQ1S6yUzHdLDbUA",
        "a-y0ruSKNQguwK-4x5.VUyQ",
        "KUX3GnypTESueDzNkM-iig",
        "JZpkbnTXQOKctUYhoLM4TQ",
        "a5d0HdEoSeKAewEGYjB1tw",
      ],
    },
    {
      PLAYER_ID: "JZpkbnTXQOKctUYhoLM4TQ",
      PLAYER_NAME: "Luka Šojić",
      ZELI_IGRATI_MECEVA: "1",
      PREOSTALO_MECEVA: "11",
      TERMINI_IGRACA: [
        { dan: "1", sat: "14" },
        { dan: "1", sat: "8" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "dnDEeNNPQNyEhCGpaAyBhQ",
        "NEpViJIiTcmloNcihgkANQ",
        "NvMXMjOdQ1S6yUzHdLDbUA",
        "LDY-2YUXQj2feUUgE57xQw",
        "tHGxFNjDQl2YkPd0ga2ZYQ",
        "Od9fmlcnSvWKXjhr9WrJpQ",
        "a-y0ruSKNQguwK-4x5.VUyQ",
        "KUX3GnypTESueDzNkM-iig",
        "a5d0HdEoSeKAewEGYjB1tw",
      ],
    },
    {
      PLAYER_ID: "a-y0ruSKNQguwK-4x5.VUyQ",
      PLAYER_NAME: "Miloš Djurovic",
      ZELI_IGRATI_MECEVA: "1",
      PREOSTALO_MECEVA: "11",
      TERMINI_IGRACA: [
        { dan: "1", sat: "14" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "dnDEeNNPQNyEhCGpaAyBhQ",
        "NEpViJIiTcmloNcihgkANQ",
        "NvMXMjOdQ1S6yUzHdLDbUA",
        "LDY-2YUXQj2feUUgE57xQw",
        "tHGxFNjDQl2YkPd0ga2ZYQ",
        "Od9fmlcnSvWKXjhr9WrJpQ",
        "KUX3GnypTESueDzNkM-iig",
        "JZpkbnTXQOKctUYhoLM4TQ",
        "a5d0HdEoSeKAewEGYjB1tw",
      ],
    },
    {
      PLAYER_ID: "NEpViJIiTcmloNcihgkANQ",
      PLAYER_NAME: "Miloš Obrenović ",
      ZELI_IGRATI_MECEVA: "1",
      PREOSTALO_MECEVA: "11",
      TERMINI_IGRACA: [
        { dan: "1", sat: "14" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "dnDEeNNPQNyEhCGpaAyBhQ",
        "NvMXMjOdQ1S6yUzHdLDbUA",
        "LDY-2YUXQj2feUUgE57xQw",
        "tHGxFNjDQl2YkPd0ga2ZYQ",
        "Od9fmlcnSvWKXjhr9WrJpQ",
        "a-y0ruSKNQguwK-4x5.VUyQ",
        "KUX3GnypTESueDzNkM-iig",
        "JZpkbnTXQOKctUYhoLM4TQ",
        "a5d0HdEoSeKAewEGYjB1tw",
      ],
    },
    {
      PLAYER_ID: "NvMXMjOdQ1S6yUzHdLDbUA",
      PLAYER_NAME: "Nemanja Pisaric",
      ZELI_IGRATI_MECEVA: "1",
      PREOSTALO_MECEVA: "11",
      TERMINI_IGRACA: [
        { dan: "1", sat: "14" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "dnDEeNNPQNyEhCGpaAyBhQ",
        "NEpViJIiTcmloNcihgkANQ",
        "a-y0ruSKNQguwK-4x5.VUyQ",
        "KUX3GnypTESueDzNkM-iig",
        "JZpkbnTXQOKctUYhoLM4TQ",
        "a5d0HdEoSeKAewEGYjB1tw",
        "LDY-2YUXQj2feUUgE57xQw",
        "tHGxFNjDQl2YkPd0ga2ZYQ",
        "Od9fmlcnSvWKXjhr9WrJpQ",
      ],
    },
    {
      PLAYER_ID: "LDY-2YUXQj2feUUgE57xQw",
      PLAYER_NAME: "Nenad Roknic",
      ZELI_IGRATI_MECEVA: "1",
      PREOSTALO_MECEVA: "10",
      TERMINI_IGRACA: [
        { dan: "1", sat: "8" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "tHGxFNjDQl2YkPd0ga2ZYQ",
        "Od9fmlcnSvWKXjhr9WrJpQ",
        "dnDEeNNPQNyEhCGpaAyBhQ",
        "NEpViJIiTcmloNcihgkANQ",
        "NvMXMjOdQ1S6yUzHdLDbUA",
        "a-y0ruSKNQguwK-4x5.VUyQ",
        "KUX3GnypTESueDzNkM-iig",
        "JZpkbnTXQOKctUYhoLM4TQ",
      ],
    },
    {
      PLAYER_ID: "Od9fmlcnSvWKXjhr9WrJpQ",
      PLAYER_NAME: "Nikola Obradovic",
      ZELI_IGRATI_MECEVA: "1",
      PREOSTALO_MECEVA: "11",
      TERMINI_IGRACA: [
        { dan: "1", sat: "8" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "tHGxFNjDQl2YkPd0ga2ZYQ",
        "LDY-2YUXQj2feUUgE57xQw",
        "dnDEeNNPQNyEhCGpaAyBhQ",
        "NEpViJIiTcmloNcihgkANQ",
        "NvMXMjOdQ1S6yUzHdLDbUA",
        "a-y0ruSKNQguwK-4x5.VUyQ",
        "KUX3GnypTESueDzNkM-iig",
        "JZpkbnTXQOKctUYhoLM4TQ",
        "a5d0HdEoSeKAewEGYjB1tw",
      ],
    },
    {
      PLAYER_ID: "tHGxFNjDQl2YkPd0ga2ZYQ",
      PLAYER_NAME: "Vladislav Groshkov",
      ZELI_IGRATI_MECEVA: "1",
      PREOSTALO_MECEVA: "11",
      TERMINI_IGRACA: [
        { dan: "1", sat: "8" },
        { dan: "3", sat: "8" },
      ],
      POTENCIJALNI_PROTIVNICI: [
        "LDY-2YUXQj2feUUgE57xQw",
        "Od9fmlcnSvWKXjhr9WrJpQ",
        "dnDEeNNPQNyEhCGpaAyBhQ",
        "NEpViJIiTcmloNcihgkANQ",
        "NvMXMjOdQ1S6yUzHdLDbUA",
        "a-y0ruSKNQguwK-4x5.VUyQ",
        "KUX3GnypTESueDzNkM-iig",
        "JZpkbnTXQOKctUYhoLM4TQ",
        "a5d0HdEoSeKAewEGYjB1tw",
      ],
    },
  ],
};

if (dev === 2) {
  setData(defaultJson);
}
