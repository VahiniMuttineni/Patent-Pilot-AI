import React from 'react';
import { Calendar, Users, FileText, ChevronRight, Quote, Globe, ExternalLink } from 'lucide-react';
import { OpenAlexWork, openAlexService } from '@/services/openalex.service';

interface ResearchCardProps {
  work: OpenAlexWork;
}

export function ResearchCard({ work }: ResearchCardProps) {
  const summary = openAlexService.reconstructAbstract(work.abstract_inverted_index);
  const truncatedSummary = summary.length > 150 ? summary.substring(0, 150) + "..." : summary;
  
  const authors = work.authorships.map(a => a.author.display_name).join(", ");
  const truncatedAuthors = authors.length > 50 ? authors.substring(0, 50) + "..." : authors;

  // Construct robust target URL ensuring dead landing pages (e.g. cairn.info 404s) are bypassed
  const getArticleUrl = (w: OpenAlexWork) => {
    const rawLanding = w.primary_location?.landing_page_url || "";
    const isKnownBroken = rawLanding.includes("cairn.info") || rawLanding.includes("error");

    if (w.doi && !w.doi.includes("cairn.info")) {
      return w.doi.startsWith("http") ? w.doi : `https://doi.org/${w.doi}`;
    }
    if (rawLanding && !isKnownBroken) {
      return rawLanding;
    }
    if (w.id) {
      return w.id.startsWith("http") ? w.id : `https://openalex.org/${w.id}`;
    }
    return `https://scholar.google.com/scholar?q=${encodeURIComponent(w.title || "")}`;
  };

  const targetUrl = getArticleUrl(work);


  // Use beautiful CSS gradients instead of external images to guarantee 100% reliability (bypasses adblockers/CSP/IP blocks)
  const idStr = work.id || work.title || "";
  const hash = Array.from(idStr).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(147,51,234,0.25) 100%)',
    'linear-gradient(135deg, rgba(5,150,105,0.25) 0%, rgba(13,148,136,0.25) 100%)',
    'linear-gradient(135deg, rgba(220,38,38,0.25) 0%, rgba(217,119,6,0.25) 100%)',
    'linear-gradient(135deg, rgba(219,39,119,0.25) 0%, rgba(225,29,72,0.25) 100%)',
    'linear-gradient(135deg, rgba(79,70,229,0.25) 0%, rgba(8,145,178,0.25) 100%)',
    'linear-gradient(135deg, rgba(14,165,233,0.25) 0%, rgba(99,102,241,0.25) 100%)'
  ];
  const selectedGradient = gradients[hash % gradients.length];
  
  const topConcept = work.concepts && work.concepts.length > 0 ? work.concepts[0].display_name : "Research";

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group border border-border bg-surface rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 flex flex-col h-full shadow-soft hover:shadow-glow cursor-pointer block text-left font-sans"
    >
      {/* Thumbnail Area with Dynamic CSS Gradient */}
      <div 
        className="h-44 w-full relative flex items-end justify-between p-3 border-b border-border bg-surface-raised"
        style={{ backgroundImage: selectedGradient }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-90 z-0 pointer-events-none"></div>
        
        {/* Metadata Badges Overlay on Image */}
        <div className="relative z-10 flex flex-wrap gap-2 w-full">
          <span className="bg-surface/90 backdrop-blur-md text-[10px] uppercase tracking-wider text-primary px-2.5 py-1 rounded-md border border-primary/30 font-semibold shadow-soft">
            {topConcept}
          </span>
          {work.open_access?.is_oa && (
            <span className="bg-success/20 backdrop-blur-md text-[10px] uppercase tracking-wider text-success px-2.5 py-1 rounded-md border border-success/30 font-semibold flex items-center shadow-soft">
              <Globe className="w-3 h-3 mr-1" /> Open Access
            </span>
          )}
        </div>
        
        <div className="relative z-10 bg-surface/80 backdrop-blur-md text-[10px] text-text-secondary px-2 py-1 rounded-md border border-border font-medium flex items-center shadow-soft shrink-0">
          <Quote className="w-3 h-3 mr-1 text-text-tertiary" /> {work.cited_by_count || 0}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold font-heading text-text-primary text-base leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors flex items-start justify-between">
          <span className="flex-1">{work.title || "Untitled Research Publication"}</span>
          <ExternalLink className="w-4 h-4 text-text-tertiary group-hover:text-primary transition-colors shrink-0 ml-2 mt-0.5" />
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-start text-text-secondary text-xs">
            <Users className="w-3.5 h-3.5 mr-2 shrink-0 mt-0.5 text-text-tertiary" />
            <span className="line-clamp-1">{truncatedAuthors || "Unknown Authors"}</span>
          </div>
          <div className="flex items-center text-text-secondary text-xs">
            <Calendar className="w-3.5 h-3.5 mr-2 shrink-0 text-text-tertiary" />
            <span>{work.publication_date || work.publication_year || "Unknown Date"}</span>
          </div>
          {work.primary_location?.source?.display_name && (
            <div className="flex items-center text-text-secondary text-xs">
              <FileText className="w-3.5 h-3.5 mr-2 shrink-0 text-text-tertiary" />
              <span className="truncate">{work.primary_location.source.display_name}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 mb-4 flex-grow">
          {truncatedSummary}
        </p>

        <div className="mt-auto inline-flex items-center text-xs font-semibold text-primary group-hover:underline self-start bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20">
          <span>Read Publication</span>
          <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </a>
  );
}

