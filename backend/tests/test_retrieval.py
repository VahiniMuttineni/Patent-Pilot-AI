import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch

from app.schemas.retrieval import UnifiedPatent, ProviderResponse, ProviderMetadata, ScientificMetadata
from app.services.providers.pubchem import PubChemProvider
from app.services.providers.chembl import ChEMBLProvider
from app.services.providers.google_patents import GooglePatentsProvider
from app.services.retrieval_service import RetrievalService

@pytest.mark.asyncio
async def test_pubchem_provider_success():
    provider = PubChemProvider()
    
    mock_cid_response = {"IdentifierList": {"CID": [12345]}}
    mock_patent = UnifiedPatent(patent_number="US123456", title="Test Patent", abstract="Abstract", source="PubChem")
    
    with patch.object(provider, 'fetch_json', new_callable=AsyncMock) as mock_fetch, \
         patch.object(provider, '_fetch_xrefs_for_cid', new_callable=AsyncMock) as mock_xrefs, \
         patch.object(provider, '_fetch_real_patent_details', new_callable=AsyncMock) as mock_details:
        
        mock_fetch.return_value = mock_cid_response
        mock_xrefs.return_value = ["US123456"]
        mock_details.return_value = mock_patent
        
        resp = await provider.retrieve_by_smiles("CCO")
        
        assert len(resp.patents) == 1
        assert resp.patents[0].patent_number == "US123456"
        assert resp.patents[0].source == "PubChem"

@pytest.mark.asyncio
async def test_pubchem_provider_no_cid():
    provider = PubChemProvider()
    
    mock_cid_response = {"IdentifierList": {}} # No CID
    
    with patch.object(provider, 'fetch_json', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_cid_response
        
        resp = await provider.retrieve_by_smiles("CCO")
        assert len(resp.patents) == 0

@pytest.mark.asyncio
async def test_chembl_provider_success():
    provider = ChEMBLProvider()
    
    mock_response = {"molecules": [{"molecule_chembl_id": "CHEMBL123", "pref_name": "Ethanol"}]}
    
    with patch.object(provider, 'fetch_json', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = mock_response
        
        resp = await provider.retrieve_by_smiles("CCO")
        assert resp.metadata.num_results == 1
        assert resp.scientific_metadata[0].chembl_id == "CHEMBL123"

@pytest.mark.asyncio
async def test_google_patents_provider():
    provider = GooglePatentsProvider()
    resp = await provider.retrieve_by_smiles("CCO")
    assert resp.metadata.status == "Unavailable"
    assert len(resp.patents) == 0

@pytest.mark.asyncio
async def test_retrieval_service_deduplication():
    # Setup mock providers returning overlapping patents
    p1 = UnifiedPatent(patent_number="US1", title="A", abstract="A", source="P1")
    p2 = UnifiedPatent(patent_number="US1", title="A", abstract="A", source="P2") # Duplicate by ID
    p3 = UnifiedPatent(patent_number="", title="Missing ID", publication_date=datetime(2023,1,1).date(), abstract="A", source="P1")
    p4 = UnifiedPatent(patent_number="", title="Missing ID", publication_date=datetime(2023,1,1).date(), abstract="A", source="P2") # Duplicate by Title+Date
    
    mock_provider1 = AsyncMock()
    mock_provider1.provider_name = "P1"
    mock_provider1.retrieve_by_smiles.return_value = ProviderResponse(
        metadata=ProviderMetadata(provider_name="P1", source_type="Patent DB", retrieval_method="Mock", status="Success", num_results=2, response_time_ms=10),
        patents=[p1, p3]
    )
    
    mock_provider2 = AsyncMock()
    mock_provider2.provider_name = "P2"
    mock_provider2.retrieve_by_smiles.return_value = ProviderResponse(
        metadata=ProviderMetadata(provider_name="P2", source_type="Patent DB", retrieval_method="Mock", status="Success", num_results=2, response_time_ms=10),
        patents=[p2, p4]
    )
    
    service = RetrievalService(providers=[mock_provider1, mock_provider2])
    
    result = await service.retrieve_patents("CCO")
    assert result.metrics.total_retrieved == 2
    assert len(result.patents) == 2
    
    numbers = [p.patent_number for p in result.patents]
    assert "US1" in numbers
    assert "" in numbers

@pytest.mark.asyncio
async def test_retrieval_service_caching():
    mock_provider = AsyncMock()
    mock_provider.provider_name = "P1"
    mock_provider.retrieve_by_smiles.return_value = ProviderResponse(
        metadata=ProviderMetadata(provider_name="P1", source_type="Patent DB", retrieval_method="Mock", status="Success", num_results=1, response_time_ms=10),
        patents=[UnifiedPatent(patent_number="US1", title="A", abstract="A", source="P1")]
    )
    
    mock_redis = AsyncMock()
    # First call: cache miss
    mock_redis.get.return_value = None
    
    service = RetrievalService(providers=[mock_provider], redis_client=mock_redis)
    result1 = await service.retrieve_patents("CCO")
    
    assert result1.metrics.cache_misses == 1
    assert result1.metrics.cache_hits == 0
    mock_redis.setex.assert_called_once()
    
    # Second call: cache hit
    cached_json = service.result_adapter.dump_json(result1)
    mock_redis.get.return_value = cached_json
    
    result2 = await service.retrieve_patents("CCO")
    assert result2.metrics.cache_hits == 1
    assert result2.metrics.cache_misses == 0
    assert len(result2.patents) == 1
    # Provider shouldn't be called again
    assert mock_provider.retrieve_by_smiles.call_count == 1

@pytest.mark.asyncio
async def test_retrieval_service_error_handling():
    mock_provider1 = AsyncMock()
    mock_provider1.provider_name = "P1"
    mock_provider1.retrieve_by_smiles.return_value = ProviderResponse(
        metadata=ProviderMetadata(provider_name="P1", source_type="Patent DB", retrieval_method="Mock", status="Success", num_results=1, response_time_ms=10),
        patents=[UnifiedPatent(patent_number="US1", title="A", abstract="A", source="P1")]
    )
    
    mock_provider2 = AsyncMock()
    mock_provider2.provider_name = "ErrorProvider"
    mock_provider2.retrieve_by_smiles.side_effect = Exception("API Timeout")
    
    service = RetrievalService(providers=[mock_provider1, mock_provider2])
    result = await service.retrieve_patents("CCO")
    
    assert len(result.patents) == 1
