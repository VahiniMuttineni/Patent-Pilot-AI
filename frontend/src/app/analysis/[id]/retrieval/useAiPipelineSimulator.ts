import { useState, useEffect, useRef } from "react";

export const PIPELINE_STAGES = [
  { id: 1, name: "Molecule Validation" },
  { id: 2, name: "Molecular Fingerprint Generation" },
  { id: 3, name: "Similar Compound Search" },
  { id: 4, name: "Patent Database Search" },
  { id: 5, name: "Prior Art Discovery" },
  { id: 6, name: "Literature Search" },
  { id: 7, name: "Patent Claim Analysis" },
  { id: 8, name: "Novelty Assessment" },
  { id: 9, name: "Risk Classification" },
  { id: 10, name: "AI Report Generation" },
];

const LOG_TEMPLATES: Record<number, string[]> = {
  1: [
    "Initializing chemical structure parsing...",
    "Validating SMILES string syntax...",
    "Converting to internal graph representation...",
    "Checking valences and atomic properties...",
    "Structure validation completed successfully.",
  ],
  2: [
    "Loading RDKit molecular descriptors...",
    "Computing Morgan fingerprints (radius=2, bits=2048)...",
    "Computing MACCS keys...",
    "Normalizing feature vectors for similarity search...",
    "Fingerprint generation complete.",
  ],
  3: [
    "Connecting to PubChem compound database...",
    "Running Tanimoto similarity search (threshold > 0.8)...",
    "Filtering for structural analogs...",
    "Retrieving bioactivity data for analogs...",
    "Compound search completed.",
  ],
  4: [
    "Authenticating with global patent APIs...",
    "Constructing Markush structure queries...",
    "Searching USPTO, EPO, and WIPO databases...",
    "Cross-referencing applicant assignees...",
    "Patent retrieval successful.",
  ],
  5: [
    "Extracting temporal priority dates...",
    "Identifying earliest known disclosures...",
    "Mapping compound claims to patent families...",
    "Indexing historical prior art references...",
    "Prior art discovery stage finalized.",
  ],
  6: [
    "Connecting to OpenAlex academic database...",
    "Querying for related mechanism-of-action papers...",
    "Filtering recent high-impact publications...",
    "Extracting relevant scientific abstracts...",
    "Literature retrieval complete.",
  ],
  7: [
    "Loading NLP models for legal text analysis...",
    "Parsing independent and dependent patent claims...",
    "Identifying structural exact matches...",
    "Evaluating formulation and method-of-use claims...",
    "Claim analysis finalized.",
  ],
  8: [
    "Comparing query molecule against prior art corpus...",
    "Evaluating structural distinctiveness...",
    "Calculating baseline novelty probability...",
    "Novelty assessment completed.",
  ],
  9: [
    "Aggregating similarity scores and legal claims...",
    "Running risk assessment heuristics...",
    "Classifying overall Freedom to Operate (FTO) risk...",
    "Risk classification complete.",
  ],
  10: [
    "Synthesizing findings...",
    "Generating natural language insights...",
    "Formatting patent landscape charts...",
    "Preparing final interactive report workspace...",
    "Analysis completed successfully.",
  ],
};

export function useAiPipelineSimulator(backendDone: boolean) {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [stageLogs, setStageLogs] = useState<Record<number, string[]>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [metrics, setMetrics] = useState({
    patents: 0,
    papers: 0,
    molecules: 0,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeStageRef = useRef(activeStageIndex);
  
  useEffect(() => {
    activeStageRef.current = activeStageIndex;
  }, [activeStageIndex]);

  // Metrics tick
  useEffect(() => {
    if (isComplete) return;
    
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
      
      const currentStage = activeStageRef.current;
      // Increment metrics based on current stage
      if (currentStage >= 2 && currentStage <= 4) {
        setMetrics((m) => ({ ...m, molecules: m.molecules + Math.floor(Math.random() * 3) }));
      }
      if (currentStage >= 3 && currentStage <= 7) {
        setMetrics((m) => ({ ...m, patents: Math.min(10, m.patents + Math.floor(Math.random() * 2)) }));
      }
      if (currentStage >= 5 && currentStage <= 8) {
        setMetrics((m) => ({ ...m, papers: Math.min(10, m.papers + Math.floor(Math.random() * 2)) }));
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isComplete]);

  // Stage execution simulation
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const executeStage = async (stageIndex: number) => {
      if (stageIndex >= PIPELINE_STAGES.length) {
        // Wait for backend if visual pipeline finishes early
        if (backendDone) {
          setIsComplete(true);
        } else {
          // Poll until backend is done
          timeoutId = setTimeout(() => executeStage(stageIndex), 500);
        }
        return;
      }

      const stageId = PIPELINE_STAGES[stageIndex].id;
      const logs = LOG_TEMPLATES[stageId];
      
      for (let i = 0; i < logs.length; i++) {
        // If backend is done, accelerate the remaining simulation
        const delay = backendDone ? 100 : Math.random() * 600 + 400; // 400ms - 1000ms per log
        
        await new Promise<void>((resolve) => {
          timeoutId = setTimeout(resolve, delay);
        });

        setStageLogs((prev) => {
          const currentStageLogs = prev[stageId] || [];
          return {
            ...prev,
            [stageId]: [...currentStageLogs, logs[i]],
          };
        });
      }

      // Small pause before moving to next stage
      await new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, backendDone ? 200 : 800);
      });

      setActiveStageIndex(stageIndex + 1);
    };

    if (!isComplete) {
      executeStage(activeStageIndex);
    }

    return () => clearTimeout(timeoutId);
  }, [activeStageIndex, backendDone, isComplete]);

  return {
    stages: PIPELINE_STAGES,
    activeStageIndex,
    stageLogs,
    isComplete,
    elapsedTime,
    metrics,
  };
}
