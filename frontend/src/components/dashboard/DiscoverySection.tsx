"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { openAlexService, OpenAlexWork } from '@/services/openalex.service';
import { ResearchCard } from './ResearchCard';

const TOPICS = [
  { id: 'patent pharmaceutical', label: 'All FTO' },
  { id: 'CRISPR patent', label: 'CRISPR & Gene Editing' },
  { id: 'monoclonal antibody patent', label: 'Biologics & mAbs' },
  { id: 'small molecule patent oncology', label: 'Small Molecules (Oncology)' },
];

export function DiscoverySection() {
  const [activeTopic, setActiveTopic] = useState(TOPICS[0].id);
  const [works, setWorks] = useState<OpenAlexWork[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    async function loadWorks() {
      setIsLoading(true);
      try {
        const data = await openAlexService.getLatestResearch(activeTopic, 1, 3);
        if (isMounted) {
          setWorks(data);
        }
      } catch (error) {
        console.error("Failed to load works", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWorks();

    return () => {
      isMounted = false;
    };
  }, [activeTopic]);

  return (
    <div className="mt-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-sm font-semibold uppercase tracking-widest font-heading">Discovery Hub</h2>
          </div>
          <h3 className="text-2xl font-bold font-heading text-text-primary flex items-center">
            Latest Research & Publications
            <TrendingUp className="w-5 h-5 ml-3 text-text-tertiary" />
          </h3>
        </div>
        
        {/* Topic Filters */}
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setActiveTopic(topic.id)}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                activeTopic === topic.id 
                  ? 'bg-primary text-primary-foreground shadow-glow font-semibold' 
                  : 'bg-surface text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-border'
              }`}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center border border-border rounded-2xl bg-surface/50 shadow-soft">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-text-secondary font-medium">Synthesizing latest global publications...</p>
        </div>
      ) : works.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {works.map((work) => (
            <ResearchCard key={work.id} work={work} />
          ))}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center border border-border rounded-2xl bg-surface/50 shadow-soft">
          <p className="text-sm text-text-secondary">No recent publications found for this topic.</p>
        </div>
      )}
    </div>
  );
}
