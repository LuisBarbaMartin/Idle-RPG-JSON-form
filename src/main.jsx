import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./main.css";

const jobs = [
  { value: "fighter", label: "Fighter" },
  { value: "paladin", label: "Paladin" },
  { value: "mage", label: "Mage" },
  { value: "wizard", label: "Wizard" },
  { value: "cleric", label: "Cleric" },
  { value: "ranger", label: "Ranger" },
  { value: "thief", label: "Thief" },
];

const traits = [
  { value: "brave", label: "Brave" },
  { value: "clever", label: "Clever" },
  { value: "reckless", label: "Reckless" },
  { value: "loyal", label: "Loyal" },
  { value: "greedy", label: "Greedy" },
];

const statNames = ["strength", "intelligence", "agility", "wisdom"];

const minimumStats = {
  strength: 3,
  intelligence: 3,
  agility: 3,
  wisdom: 3,
};

function getPointsPerLevel(level) {
  const basePoints = 3;
  const milestoneBonus = Math.floor(level / 10);

  return basePoints + milestoneBonus;
}

function calculateStatPool(level) {
  let totalPoints = 0;

  for (let currentLevel = 2; currentLevel <= level; currentLevel++) {
    totalPoints = totalPoints + getPointsPerLevel(currentLevel);
  }

  return totalPoints;
}

function createInitialStats() {
  return { ...minimumStats };
}

// potential to improve here.
function createCharacterId(name, job) {
  const jobPart = job || "character";
  const namePart = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  return namePart ? `${jobPart}_${namePart}` : jobPart;
}

function App() {
  const [name, setName] = useState("");
  const [job, setJob] = useState("");
  const [level, setLevel] = useState(1);
  const [stats, setStats] = useState(createInitialStats);
  const [availableStatPoints, setAvailableStatPoints] = useState(0);
  const [traitSelectValue, setTraitSelectValue] = useState("");
  const [selectedTraits, setSelectedTraits] = useState([]);
  const [generatedJson, setGeneratedJson] = useState("");
  const [uploadedJson, setUploadedJson] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const selectedTraitValues = useMemo(
    function () {
      return selectedTraits.map(function (trait) {
        return trait.value;
      });
    },
    [selectedTraits],
  );

  function handleLevelChange(event) {
    const nextLevel = Number(event.target.value);

    setLevel(event.target.value);

    if (nextLevel < 1 || Number.isNaN(nextLevel)) {
      setAvailableStatPoints(0);
      return;
    }

    setStats(createInitialStats());
    setAvailableStatPoints(calculateStatPool(nextLevel));
  }

  function increaseStat(statName) {
    if (availableStatPoints <= 0) {
      return;
    }

    setStats(function (currentStats) {
      return {
        ...currentStats,
        [statName]: currentStats[statName] + 1,
      };
    });
    setAvailableStatPoints(function (currentPoints) {
      return currentPoints - 1;
    });
  }

  function increaseStatByFive(statName) {
    if (availableStatPoints <= 0) {
      return;
    }

    const pointsToSpend = Math.min(5, availableStatPoints);

    setStats(function (currentStats) {
      return {
        ...currentStats,
        [statName]: currentStats[statName] + pointsToSpend
      };
    });

    setAvailableStatPoints(function (currentPoints) {
      return currentPoints - pointsToSpend;
    });
  }


  function decreaseStat(statName) {
    if (stats[statName] <= minimumStats[statName]) {
      return;
    }

    setStats(function (currentStats) {
      return {
        ...currentStats,
        [statName]: currentStats[statName] - 1,
      };
    });
    setAvailableStatPoints(function (currentPoints) {
      return currentPoints + 1;
    });
  }

  function decreaseStatByFive(statName) {
    if (stats[statName] <= minimumStats[statName]) {
      return;
    }

    const pointsToRefund = Math.min(5, stats[statName] - minimumStats[statName]);

    setStats(function (currentStats) {
      return {
        ...currentStats,
        [statName]: currentStats[statName] - pointsToRefund
      };
    });

    setAvailableStatPoints(function (currentPoints) {
      return currentPoints + pointsToRefund;
    });
  }

  function addTrait() {
    const traitToAdd = traits.find(function (trait) {
      return trait.value === traitSelectValue;
    });

    if (!traitToAdd) {
      return;
    }

    if (
      selectedTraits.some(function (trait) {
        return trait.value === traitToAdd.value;
      })
    ) {
      return;
    }

    setSelectedTraits(function (currentTraits) {
      return [...currentTraits, traitToAdd];
    });
    setTraitSelectValue("");
  }

  function removeTrait(traitValueToRemove) {
    setSelectedTraits(function (currentTraits) {
      return currentTraits.filter(function (trait) {
        return trait.value !== traitValueToRemove;
      });
    });
  }

  function buildCharacterJson() {
    const selectedJob = jobs.find(function (jobOption) {
      return jobOption.value === job;
    });

    const character = {
      [createCharacterId(name, job)]: {
        name,
        job: selectedJob ? selectedJob.label : "",
        base_strength: stats.strength,
        base_intelligence: stats.intelligence,
        base_agility: stats.agility,
        base_wisdom: stats.wisdom,
        level: Number(level),
        traits: selectedTraitValues,
      },
    };

    return JSON.stringify(character, null, 2);
  }

  function buildMergedCharacterJson() {
    const newCharacterJson = JSON.parse(buildCharacterJson());
    const mergedJson = {
      ...(uploadedJson || {}),
      ...newCharacterJson
    };

    return JSON.stringify(mergedJson, null, 2);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setGeneratedJson(uploadedJson ? buildMergedCharacterJson() : buildCharacterJson());
  }

  function downloadJson() {
    const blob = new Blob([generatedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${createCharacterId(name, job)}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function handleJsonUpload(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = function () {
      try {
        const parsedJson = JSON.parse(reader.result);

        setUploadedJson(parsedJson);
        setUploadError("");
      } catch {
        setUploadedJson(null);
        setUploadError("That file is not valid JSON.");
      }
    };

    reader.readAsText(file);
  }


  return (
    <main className="app-shell">
      <h1>Character JSON Builder</h1>
      <form id="character-form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="json-upload">Upload JSON:</label>
          <input
            id="json-upload"
            type="file"
            accept=".json,application/json"
            onChange={handleJsonUpload}
          />
        </div>
        {uploadedJson && <p className="form-note">JSON loaded. Generated characters will be appended to it.</p>}
        {uploadError && <p className="form-error">{uploadError}</p>}

        <div className="form-field">
          <label htmlFor="character-name">Character Name:</label>
          <input
            id="character-name"
            name="name"
            type="text"
            value={name}
            onChange={function (event) {
              setName(event.target.value);
            }}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="character-job">Job:</label>
          <select
            id="character-job"
            name="job"
            value={job}
            onChange={function (event) {
              setJob(event.target.value);
            }}
            required>
            <option value="">Select a job</option>
            {jobs.map(function (jobOption) {
              return (
                <option key={jobOption.value} value={jobOption.value}>
                  {jobOption.label}
                </option>
              );
            })}
          </select>
        </div>

        <div className="level-row">
          <label htmlFor="character-level">Level:</label>
          <input id="character-level" name="level" type="number" min="1" max="100" value={level} onChange={handleLevelChange} required />

          <p>
            Available Stat Points: <strong>{availableStatPoints}</strong>
          </p>
        </div>

        <div className="stats-grid">
          {statNames.map(function (statName) {
            return (
              <div className="stat-control" key={statName}>
                <label htmlFor={`character-${statName}`}>{statName.charAt(0).toUpperCase() + statName.slice(1)}</label>

                <div className="stat-buttons">
                  <button type="button" onClick={function () {
                    decreaseStatByFive(statName);
                  }}>
                    -5
                  </button>
                  
                  <button
                    type="button"
                    onClick={function () {
                      decreaseStat(statName);
                    }}>
                    -
                  </button>
                  

                  <input id={`character-${statName}`} name={statName} type="number" value={stats[statName]} readOnly />
                  <button

                    type="button"
                    onClick={function () {
                      increaseStat(statName);
                    }}>
                    +
                  </button>

                  <button type="button" onClick={function () {
                    increaseStatByFive(statName);
                  }}>
                    +5
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="trait-controls">
          <label htmlFor="trait-select">Traits:</label>

          <select
            id="trait-select"
            value={traitSelectValue}
            onChange={function (event) {
              setTraitSelectValue(event.target.value);
            }}>
            <option value="">Choose a trait</option>
            {traits.map(function (trait) {
              return (
                <option key={trait.value} value={trait.value}>
                  {trait.label}
                </option>
              );
            })}
          </select>

          <button type="button" onClick={addTrait}>
            Add Trait
          </button>
        </div>

        <div id="selected-traits-container">
          {selectedTraits.map(function (trait) {
            return (
              <span className="trait-tag" key={trait.value}>
                {trait.label}
                <button
                  type="button"
                  className="remove-trait-button"
                  onClick={function () {
                    removeTrait(trait.value);
                  }}
                  aria-label={`Remove ${trait.label}`}>
                  x
                </button>
              </span>
            );
          })}
        </div>

        <button type="submit">Generate JSON</button>
      </form>

      <section className="preview-section">
        <h2>Preview</h2>
        <pre id="json-preview">{generatedJson}</pre>

        <button type="button" disabled={!generatedJson} onClick={downloadJson}>
          Download JSON
        </button>
      </section>
    </main>
  );
}

createRoot(document.querySelector("#root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
