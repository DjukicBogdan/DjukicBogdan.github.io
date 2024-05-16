let maxCombination = 0;
async function generateMatches(players, matches, currentMatch, courts) {
  if (currentMatch.length === players.length || currentMatch.length > maxCombination) {
    if (maxCombination < currentMatch.length) {
      maxCombination = currentMatch.length;
    }
    // All players processed, add the current match combination
    matches.push([currentMatch]);
    matches.sort();
    return matches;
  }

  const playerIndex = currentMatch.length;
  const player1 = players[playerIndex];

  for (let player2 of player1.POTENCIJALNI_PROTIVNICI) {
    player2 = players.find((p) => p.PLAYER_ID === player2);
    //     let check = false;
    //     if (priorityID == 10) {
    //       for (let i = 0; i < currentMatch.length; i++) {
    //         if (
    //           currentMatch[i].player1ID === player1.PLAYER_ID ||
    //           currentMatch[i].player2ID === player1.PLAYER_ID ||
    //           currentMatch[i].player1ID === player1.PLAYER_ID ||
    //           currentMatch[i].player2ID === player1.PLAYER_ID
    //         ) {
    //           check = true;
    //           console.log(currentMatch);
    //         }
    //       }
    //     } else if (priorityID === 20) {
    //     } else if (priorityID === 30) {
    //     } else if (priorityID === 40) {
    //     } else if (priorityID === 50) {
    //     }

    player1.ZELI_IGRATI_MECEVA = parseInt(player1.ZELI_IGRATI_MECEVA);
    player2.ZELI_IGRATI_MECEVA = parseInt(player2.ZELI_IGRATI_MECEVA);
    player1.PREOSTALO_MECEVA = parseInt(player1.PREOSTALO_MECEVA);
    player2.PREOSTALO_MECEVA = parseInt(player2.PREOSTALO_MECEVA);
    if (player1.PREOSTALO_MECEVA > 0 && player2.PREOSTALO_MECEVA > 0 && player1.ZELI_IGRATI_MECEVA > 0 && player2.ZELI_IGRATI_MECEVA > 0) {
      let termini = [];

      for (let i = 0; i < player1.TERMINI_IGRACA.length; i++) {
        let termin = player2.TERMINI_IGRACA.find((s) => player1.TERMINI_IGRACA[i].sat == s.sat && player1.TERMINI_IGRACA[i].dan == s.dan);
        if (termin) {
          termini.push(termin);
        }
      }
      const commonSlots = [...termini];

      for (const slot of commonSlots) {
        if (courts.find((c) => c.dan == slot.dan && c.sat == slot.sat)) {
          // Create a match
          const allocatedCourt = allocateCourt(slot);
          if (allocatedCourt !== null) {
            currentMatch.push({
              player1ID: player1.PLAYER_ID,
              player2ID: player2.PLAYER_ID,
              //   timeSlot: slot,
              court: allocatedCourt,
              dayPlayed: allocatedCourt.dan,
              hourPlayed: allocatedCourt.sat,
              courtID: allocatedCourt.teren,
            });

            player1.PREOSTALO_MECEVA--;
            player2.PREOSTALO_MECEVA--;
            player1.ZELI_IGRATI_MECEVA--;
            player2.ZELI_IGRATI_MECEVA--;
            if (countIterations < 2000) {
              generateMatches(players, matches, currentMatch, courts);
              countIterations++;
              //   console.log(countIterations);
            } else {
              let allMatches0 = JSON.parse(JSON.stringify(matches));
              if (matches.length > 0) {
                matches.sort();
                allMatches0 = matches[matches.length - 1];
              } else {
                allMatches0 = JSON.parse(JSON.stringify(matches));
              }
              countIterations -= 10;
              return allMatches0;
            }
            // Backtrack: restore state
            player1.PREOSTALO_MECEVA++;
            player2.PREOSTALO_MECEVA++;
            player1.ZELI_IGRATI_MECEVA++;
            player2.ZELI_IGRATI_MECEVA++;
            currentMatch.pop();
            courts.push(allocatedCourt);
          }
        }
      }
    }
  }
}
let countIterations = 0;

// Example usage:
// let allMatches = [];
// let currentMatch = [];
// let allTimeSlots = [
//   /* DAY-HOUR combinations */
// ]; // e.g., 1-10 represents Monday 10:00 AM

// // Sample player objects (replace with your actual data)
// let players = [];

// // Initialize courts with available court IDs per time slot
// let courts = {};

// Function to allocate a court based on availability
function allocateCourt(timeSlot) {
  //   if (courts[timeSlot].length > 0) {
  let t = courts.find((c) => c.dan == timeSlot.dan && c.sat == timeSlot.sat);
  if (t) {
    return courts.shift(); // Allocate the first available court
  }
  return null; // No available court
}

// Start the backtracking process

async function setData(data) {
  //   players = data.IGRACI;
  //   courts = data.TERMINI_KLUBA;
  //   let result = await generateMatches(players, allMatches, currentMatch, courts);
}

async function prioritizeMatches(data) {
  let prioritizedMatches = []; // Koristimo Set za čuvanje jedinstvenih mečeva
  maxCombination = 0;
  players = JSON.parse(JSON.stringify(data.IGRACI));
  courts = JSON.parse(JSON.stringify(data.TERMINI_KLUBA));
  allMatches = [];
  currentMatch = [];
  matches = [];
  let totalScore = 0;
  prioritizedMatches = await generateMatches(players, matches, currentMatch, courts);
  let priorities = data.PRIORITETI.sort(function (a, b) {
    return a.id - b.id;
  });
  for (const priority of priorities) {
    // players = JSON.parse(JSON.stringify(data.IGRACI));
    // courts = JSON.parse(JSON.stringify(data.TERMINI_KLUBA));
    // let matches = new Array();
    // let allMatches = new Array();
    // let currentMatch = new Array();

    // let players2 = JSON.parse(JSON.stringify(data.IGRACI));
    // let matches2 = new Array();
    // let allMatches2 = new Array();
    // let currentMatch2 = new Array();
    // let courts2 = JSON.parse(JSON.stringify(data.TERMINI_KLUBA));

    switch (priority.id) {
      case "10":
        let brojIgracaKojimaJeNadjenMec = [...new Set(prioritizedMatches[0].map((item) => item.player1ID))].length;
        let brojProsledjenihIgraca = data.IGRACI.length;
        let Min1MecScore = 0;
        if (brojIgracaKojimaJeNadjenMec > 0 && brojProsledjenihIgraca > 0) {
          Min1MecScore = brojIgracaKojimaJeNadjenMec / brojProsledjenihIgraca;
        }
        priority.score = Min1MecScore * priority.priority;
        console.log(priority);
        break;
      case "20":
        let brojPronadjenihMeceva = prioritizedMatches[0].length;
        let klubPonudioTermine = data.TERMINI_KLUBA.length;
        let MaxMecScore = 0;
        if (brojPronadjenihMeceva > 0 && klubPonudioTermine > 0) {
          MaxMecScore = brojPronadjenihMeceva / klubPonudioTermine;
        }
        priority.score = MaxMecScore * priority.priority;
        console.log(priority);
        break;
      case "30":
        let brojPronadjenihJutarnjihMeceva = 0;
        let klubPonudioJutarnjeTermine = 0;
        let JutarnjiTerminiScore = 0;

        for (let i = 0; i < prioritizedMatches[0].length; i++) {
          if (prioritizedMatches[0][i].hourPlayed < 12) {
            brojPronadjenihJutarnjihMeceva += Number(prioritizedMatches[0][i].hourPlayed);
          }
        }
        for (let i = 0; i < data.TERMINI_KLUBA.length; i++) {
          if (Number(data.TERMINI_KLUBA[i].sat) < 12) {
            klubPonudioJutarnjeTermine += Number(data.TERMINI_KLUBA[i].sat);
          }
        }
        if (brojPronadjenihJutarnjihMeceva > 0 && klubPonudioJutarnjeTermine > 0) {
          JutarnjiTerminiScore = brojPronadjenihJutarnjihMeceva / klubPonudioJutarnjeTermine;
        }
        priority.score = JutarnjiTerminiScore * priority.priority;
        console.log(priority);
        break;
      case "40":
        let ukupanBrojProstalihMecevaZaSveIgraceIzKombinacije = 0;
        let ukupanBrojProstalihMecevaZaSveIgraceIzJsona = 0;
        let BrojPreostalihMecevaScore = 0;

        let ListaSvihIgracaUKombinaciji = [];
        for (let i = 0; i < prioritizedMatches[0].length; i++) {
          ListaSvihIgracaUKombinaciji.push(prioritizedMatches[0][i].player1ID);
          ListaSvihIgracaUKombinaciji.push(prioritizedMatches[0][i].player2ID);
        }
        let unikatnaListaSvihIgracaUKombinaciji = [];
        for (let i = 0; i < ListaSvihIgracaUKombinaciji.length; i++) {
          let count = 0;
          for (let j = 0; j < unikatnaListaSvihIgracaUKombinaciji.length; j++) {
            if (unikatnaListaSvihIgracaUKombinaciji[j] && ListaSvihIgracaUKombinaciji[i] == unikatnaListaSvihIgracaUKombinaciji[j].igrac) {
              count++;
            }
          }
          if (count == 0) {
            unikatnaListaSvihIgracaUKombinaciji.push({ igrac: ListaSvihIgracaUKombinaciji[i], ponavljanje: 1 });
          } else {
            let p = unikatnaListaSvihIgracaUKombinaciji.find((igrac) => igrac.igrac == ListaSvihIgracaUKombinaciji[i]);
            p.ponavljanje += count;
          }
          count = 0;
        }
        for (let i = 0; i < unikatnaListaSvihIgracaUKombinaciji.length; i++) {
          let igrac = data.IGRACI.find((igr) => igr.PLAYER_ID == unikatnaListaSvihIgracaUKombinaciji[i].igrac);
          ukupanBrojProstalihMecevaZaSveIgraceIzKombinacije += Number(igrac.PREOSTALO_MECEVA);
        }
        for (let i = 0; i < data.IGRACI.length; i++) {
          ukupanBrojProstalihMecevaZaSveIgraceIzJsona += Number(data.IGRACI[i].PREOSTALO_MECEVA);
        }
        BrojPreostalihMecevaScore = ukupanBrojProstalihMecevaZaSveIgraceIzKombinacije / ukupanBrojProstalihMecevaZaSveIgraceIzJsona;
        priority.score = BrojPreostalihMecevaScore * priority.priority;
        console.log(priority);
        break;
      case "50":
        let ukupanBrojPrijavljenihTerminaZaSveIgraceIzKombinacije = 0;
        let ukupanBrojPrijavljenihTerminaZaSveIgraceIzJsona = 0;
        let BrojPrijavljenihTerminaScore = 0;

        let ListaSvihIgracaUKombinacijiPrijavljenihTermina = [];
        for (let i = 0; i < prioritizedMatches[0].length; i++) {
          ListaSvihIgracaUKombinacijiPrijavljenihTermina.push(prioritizedMatches[0][i].player1ID);
          ListaSvihIgracaUKombinacijiPrijavljenihTermina.push(prioritizedMatches[0][i].player2ID);
        }
        let unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina = [];
        for (let i = 0; i < ListaSvihIgracaUKombinacijiPrijavljenihTermina.length; i++) {
          let count = 0;
          for (let j = 0; j < unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina.length; j++) {
            if (unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina[j] && ListaSvihIgracaUKombinacijiPrijavljenihTermina[i] == unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina[j].igrac) {
              count++;
            }
          }
          if (count == 0) {
            unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina.push({ igrac: ListaSvihIgracaUKombinacijiPrijavljenihTermina[i], ponavljanje: 1 });
          } else {
            let p = unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina.find((igrac) => igrac.igrac == ListaSvihIgracaUKombinacijiPrijavljenihTermina[i]);
            p.ponavljanje += count;
          }
          count = 0;
        }
        for (let i = 0; i < unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina.length; i++) {
          let igrac = data.IGRACI.find((igr) => igr.PLAYER_ID == unikatnaListaSvihIgracaUKombinacijiPrijavljenihTermina[i].igrac);
          ukupanBrojPrijavljenihTerminaZaSveIgraceIzKombinacije += Number(igrac.PREOSTALO_MECEVA);
        }
        for (let i = 0; i < data.IGRACI.length; i++) {
          ukupanBrojPrijavljenihTerminaZaSveIgraceIzJsona += Number(data.IGRACI[i].PREOSTALO_MECEVA);
        }
        if (ukupanBrojPrijavljenihTerminaZaSveIgraceIzKombinacije > 0 && ukupanBrojPrijavljenihTerminaZaSveIgraceIzJsona > 0) {
        }
        BrojPrijavljenihTerminaScore = ukupanBrojPrijavljenihTerminaZaSveIgraceIzKombinacije / ukupanBrojPrijavljenihTerminaZaSveIgraceIzJsona;
        priority.score = BrojPrijavljenihTerminaScore * priority.priority;
        console.log(priority);
        break;
      default:
        break;
    }
  }

  for (let i = 0; i < data.PRIORITETI.length; i++) {
    totalScore += data.PRIORITETI[i].score;
  }
  // totalScore = P1score * P1weight  + P2score * P2weight ..
  console.log("totalScore: ", totalScore);
  console.log("formula: P1-score * P1-weight + P2-score * P2-weight ...");
  console.log("weight === json.PRIORITETI(key.priority)");
  prioritizedMatches.push({"totalScore":totalScore});
  console.log(await prioritizedMatches);
  return await prioritizedMatches; // Pretvaramo Set nazad u niz pre vraćanja rezultata
}
// let players = [];
// let allMatches = [];
// let courts = {};
// let currentMatch = [];
// let matches = [];
// fetch("./datagenerisani4.json")
//   .then((response) => response.json())
//   .then((json) => prioritizeMatches(json));

window.function = async function (text) {
    let json = JSON.parse(text.value);

    // Provera da li je JSON objekat validan
    if (!json || typeof json !== "object") {
      return "Invalid JSON data format: Data is not a valid JSON object.";
    }

    // Provera ostalih neophodnih delova JSON-a
    if (!json.IGRACI || !Array.isArray(json.IGRACI) || !json.TERMINI_KLUBA || !Array.isArray(json.TERMINI_KLUBA) || !json.PRIORITETI || !Array.isArray(json.PRIORITETI)) {
      return "Invalid JSON data format: Missing player information, club slots, or priorities.";
    }

    let result = await prioritizeMatches(json);
    let senddata = await JSON.stringify(result);
    return await senddata.toString();
  };
