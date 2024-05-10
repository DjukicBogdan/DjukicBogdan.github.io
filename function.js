
  window.function = function (text) {
  let json = JSON.parse(text.value);
  let result = handleData(json);
  let senddata = JSON.stringify(result);
  return senddata;
  }

async function handleData(json) {
  try {
    if (!json || !json.IGRACI || !Array.isArray(json.IGRACI)) {
     return "Invalid JSON data format: Missing player information.";
    }
    const matches = getValidMatches(json);
    const prioritizedMatches = prioritizeMatches(matches, json.PRIORITETI, json);
    return prioritizedMatches;
  } catch (error) {
    return "Error while processing data:"+ error;
  }
}

function getValidMatches(data) {
  if (!data || !data.IGRACI || !Array.isArray(data.IGRACI)) {
    return "Invalid JSON data: Missing player information.";
  }

  const players = data.IGRACI;
  const matches = [];
  const clubAvailableSlots = data.TERMINI_KLUBA;

  players.forEach((player) => {
    if (parseInt(player.ZELI_IGRATI_MECEVA) > 0) {
      const remainingMatches = parseInt(player.ZELI_IGRATI_MECEVA);
      let playedMatches = 0;

      player.TERMINI_IGRACA.forEach((slot) => {
        const clubSlot = clubAvailableSlots.find((clubSlot) => clubSlot.dan === slot.dan && clubSlot.sat === slot.sat);
        if (clubSlot && playedMatches < remainingMatches) {
          player.POTENCIJALNI_PROTIVNICI.forEach((opponent) => {
            const opponentPlayer = players.find((p) => p.PLAYER_NAME === opponent);
            if (opponentPlayer) {
              const opponentSlot = opponentPlayer.TERMINI_IGRACA.find((opponentSlot) => opponentSlot.dan === slot.dan && opponentSlot.sat === slot.sat);
              if (opponentSlot) {
                matches.push({
                  player1: player.PLAYER_NAME,
                  player2: opponent,
                  time: `${slot.dan} ${slot.sat}`,
                });
                playedMatches++;
              }
            }
          });
        }
      });
    }
  });

  return matches;
}

function prioritizeMatches(matches, priorities, data) {
  const prioritizedMatches = new Set(); // Use a Set to store unique matches

  for (const priority of priorities) {
    switch (priority.id) {
      case "10":
        // Ensure each player plays at least one match
        matches.forEach((match) => {
          if (!prioritizedMatches.has(match)) { // Use has() to check if a match exists in the Set
            prioritizedMatches.add(match); // Add match to the Set
          }
        });
        break;
      case "20":
        // Maximize the number of matches
        matches.forEach((match) => prioritizedMatches.add(match)); // Add matches to the Set
        break;
      case "30":
        // Prioritize morning slots (if required)
        matches.sort((a, b) => {
          // Extract the hour part from the time string and convert it to a number
          const hourA = parseInt(a.time.split(" ")[1]);
          const hourB = parseInt(b.time.split(" ")[1]);

          // Check if the time is before 12:00 PM
          const isMorningA = hourA <= 12;
          const isMorningB = hourB <= 12;

          // If both matches are in the morning or both are not, sort by time
          if (isMorningA === isMorningB) {
            // Sort by time (earlier time first)
            return hourA - hourB;
          } else {
            // Sort morning match first
            return isMorningB ? -1 : 1;
          }
        });

        matches.forEach((match) => prioritizedMatches.add(match)); // Add matches to the Set
        break;
      case "40":
        // Prioritize players with the most remaining matches
        matches.sort((a, b) => {
          const player1Matches = data.IGRACI.find((player) => player.PLAYER_NAME === a.player1).PREOSTALO_MECEVA;
          const player2Matches = data.IGRACI.find((player) => player.PLAYER_NAME === b.player2).PREOSTALO_MECEVA;
          return player2Matches - player1Matches;
        });

        matches.forEach((match) => prioritizedMatches.add(match)); // Add matches to the Set
        break;
      case "50":
        // Prioritize players who have signed up for the most slots
        // Calculate the number of slots each player has signed up for
        const playerSlotsCounts = {};

        matches.forEach((match) => {
          // Increment slot count for player 1
          playerSlotsCounts[match.player1] = (playerSlotsCounts[match.player1] || 0) + 1;
          // Increment slot count for player 2
          playerSlotsCounts[match.player2] = (playerSlotsCounts[match.player2] || 0) + 1;
        });

        // Sort players based on the number of slots they have signed up for
        matches.sort((a, b) => {
          const slotsCountA = playerSlotsCounts[a.player1] + playerSlotsCounts[a.player2];
          const slotsCountB = playerSlotsCounts[b.player1] + playerSlotsCounts[b.player2];
          return slotsCountB - slotsCountA; // Sort in descending order of slot counts
        });

        matches.forEach((match) => prioritizedMatches.add(match)); // Add matches to the Set
        break;

      // Implement other prioritization criteria as needed
      default:
        break;
    }
  }

  return Array.from(prioritizedMatches); // Convert the Set back to an array before returning
}
