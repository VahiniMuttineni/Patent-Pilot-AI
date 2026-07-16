import React from 'react';
import Image from 'next/image';
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


  // Use high-quality curated biotech/scientific images from Unsplash to act as figures/thumbnails
  const idStr = work.id || work.title || "";
  const hash = Array.from(idStr).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hqImages = [
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&q=80&w=400', // Science Monitor
    'https://images.unsplash.com/photo-1532187643603-c11fce5d475a?auto=format&fit=crop&q=80&w=400', // Cells
    'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&q=80&w=400', // Lab equipment
    'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=400', // Scientist Pipette
    'https://images.unsplash.com/photo-1579154204601-01588f351e71?auto=format&fit=crop&q=80&w=400', // Tubes
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=400', // Flask
    'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&q=80&w=400', // Microscopic virus
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400'  // Open Book
  ];
  const selectedImage = hqImages[hash % hqImages.length];
  
  const topConcept = work.concepts && work.concepts.length > 0 ? work.concepts[0].display_name : "Research";

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group border border-border bg-surface rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 flex flex-col h-full shadow-soft hover:shadow-glow cursor-pointer block text-left font-sans"
    >
      {/* Thumbnail Area with High-Quality Image */}
      <div className="h-44 w-full relative flex items-end justify-between p-3 border-b border-border bg-surface-raised overflow-hidden">
        <Image 
          src={selectedImage}
          alt={work.title || "Research Publication"}
          fill
          className="object-cover z-0"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90 z-0"></div>
        
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

