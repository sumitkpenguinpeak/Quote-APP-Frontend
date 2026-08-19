import React, {useCallback,useMemo,useState,} from 'react';
import {Page,Card,IndexTable,useIndexResourceState,Filters,ChoiceList,Badge,Text,EmptySearchResult,Pagination,BlockStack,InlineStack,Spinner,Button,Box,} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';

import AppLayout from '../components/AppLayout';
import useQuote from '../hooks/useQuote';
import { formatDate } from '../utils/date';
import { getShopFromUrl } from '../services/api';
import { ErrorState, LoadingState } from '../components/CommonLoading';

const PAGE_SIZE = 10;

 // * Quote status configuration
const STATUS_CONFIG = {
  pending: {
    label: 'New Received',
    tone: 'info',
  },

  new_received: {
    label: 'New Received',
    tone: 'info',
  },

  read: {
    label: 'Read',
    tone: 'attention',
  },

  approved: {
    label: 'Approved',
    tone: 'info',
  },

  converted: {
    label: 'Converted',
    tone: 'success',
  },

  deal_closed: {
    label: 'Deal Closed',
    tone: 'success',
  },

  rejected: {
    label: 'Rejected',
    tone: 'critical',
  },

  deal_rejected: {
    label: 'Deal Rejected',
    tone: 'critical',
  },

  trashed: {
    label: 'Trashed',
    tone: 'subdued',
  },
};


 // * Get customer full name
function getCustomerName(customer) {
  if (!customer) {return '-';}

  const name = [customer.first_name,customer.last_name,]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || '-';
}


 //  Get status config
function getStatusConfig(status) {
  if (!status) {
    return {label: '-', tone: 'subdued',};
  }

  return (
    STATUS_CONFIG[status] || { label: status .replace(/_/g, ' ') .replace(/\b\w/g, (char) =>char.toUpperCase()), tone: 'subdued',}
  );
}

export default function QuoteList() {
  const navigate = useNavigate();
  const {data: quotes,loading,error,fetchData,} = useQuote();
  // STATE
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);


  // NORMALIZE API DATA
  const normalizedQuotes = useMemo(() => {
    if (!Array.isArray(quotes)) {return [];}
    return quotes.map((quote) => ({...quote,id: String(quote.id),}));
  }, [quotes]);

  // TOP TABS
  const tabs = useMemo(
    () => [
      {
        id: 'all',
        content: 'All',
      },
      {
        id: 'pending',
        content: 'New Received',
      },
      {
        id: 'read',
        content: 'Read',
      },
      {
        id: 'converted',
        content: 'Deal Closed',
      },
      {
        id: 'rejected',
        content: 'Deal Rejected',
      }
    ],
    []
  );

  // TAB FILTER
  const tabFilteredQuotes = useMemo(() => {
    if (activeTab === 'all') {return normalizedQuotes;}
    return normalizedQuotes.filter((quote) => {
      const status = quote.status;
      if (activeTab === 'pending') {return (status === 'pending');}
      if (activeTab === 'read') {return status === 'read';}
      if (activeTab === 'converted') {return (status === 'deal_closed');}
      if (activeTab === 'rejected') {return (status === 'rejected');}
      return true;
    });
  }, [normalizedQuotes, activeTab]);

  // SEARCH + FILTER
  const filteredQuotes = useMemo(() => {
    const search = searchValue
      .trim()
      .toLowerCase();

    return tabFilteredQuotes.filter((quote) => {
      const customer = quote.customer || {};
      const customerName = getCustomerName(customer).toLowerCase();
      const email = customer.email?.toLowerCase() || '';
      const quoteNumber = quote.quote_number?.toLowerCase() || '';
      const matchesSearch = !search || quoteNumber.includes(search) || customerName.includes(search) || email.includes(search);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(quote.status);
      return (matchesSearch && matchesStatus);
    });
  }, [tabFilteredQuotes, searchValue,statusFilter,]);

  // RESET PAGE IF FILTER CHANGES
  const totalPages = Math.max(1,Math.ceil(filteredQuotes.length / PAGE_SIZE));
  const safePage = Math.min(page,totalPages);

  // PAGINATION
  const paginatedQuotes = useMemo(() => {
    const start =(safePage - 1) * PAGE_SIZE;
    return filteredQuotes.slice( start, start + PAGE_SIZE);
  }, [filteredQuotes, safePage,]);

  const {selectedResources, allResourcesSelected,handleSelectionChange, } = useIndexResourceState(paginatedQuotes);

  // SEARCH
  const handleSearchChange = useCallback( (value) => {setSearchValue(value);setPage(1);},[]);

  // STATUS FILTER
  const handleStatusChange = useCallback((value) => {setStatusFilter(value); setPage(1);},[]);

  // CLEAR ALL
  const handleClearAll = useCallback(() => {
    setSearchValue('');
    setStatusFilter([]);
    setActiveTab('all');
    setPage(1);
  }, []);

  // FILTER CONFIG
  const filters = useMemo(
    () => [
      {
        key: 'status',
        label: 'Status',

        filter: (
          <ChoiceList
            title="Status"
            titleHidden
            allowMultiple
            choices={[
              {
                label: 'New Received',
                value: 'pending',
              },
              {
                label: 'Read',
                value: 'read',
              },
              {
                label: 'Approved',
                value: 'approved',
              },
              {
                label: 'Converted',
                value: 'converted',
              },
              {
                label: 'Rejected',
                value: 'rejected',
              }
            ]}
            selected={statusFilter}
            onChange={handleStatusChange}
          />
        ),

        shortcut: true,
      },
    ],
    [
      statusFilter,
      handleStatusChange,
    ]
  );


  // APPLIED FILTERS
  const appliedFilters = useMemo(() => {
    if (!statusFilter.length) {return [];}

    return [
      {
        key: 'status',
        label: `Status: ${statusFilter
          .map((status) => getStatusConfig(status).label)
          .join(', ')}`,

        onRemove: () => {setStatusFilter([]); setPage(1);},
      },
    ];
  }, [statusFilter]);


  // TAB CHANGE
  const handleTabChange = useCallback(
    (selectedTabIndex) => {
      const selectedTab = tabs[selectedTabIndex];
      if (!selectedTab) {return;}
      setActiveTab(selectedTab.id);
      setPage(1);
    },[tabs]
  );

  // ROW CLICK
  const handleRowClick = useCallback(
    (path, id) => {
      const shop = getShopFromUrl();
      navigate(`${path}/${id}?shop=${encodeURIComponent(shop)}`);
    },[navigate]
  );


  // ROW MARKUP
  const rowMarkup = useMemo(() => {
    return paginatedQuotes.map(
      (quote, index) => {
        const customer = quote.customer || {};
        const customerName = getCustomerName(customer);
        const status = getStatusConfig(quote.status);
        const assignedStaff =quote.assigned_staff;

        return (
          <IndexTable.Row
            id={quote.id}
            key={quote.id}
            position={index}
            selected={selectedResources.includes(quote.id)}
            onClick={() =>handleRowClick ("/quotedetail",quote.id)}
          >

            <IndexTable.Cell><Text as="span" variant="bodyMd" fontWeight="semibold">{quote.quote_number || `#${quote.id}`}</Text></IndexTable.Cell>
            <IndexTable.Cell>
              <BlockStack gap="050">
                <Text as="span" variant="bodyMd" >{customerName}</Text>
                <Text as="span" variant="bodySm" tone="subdued">{customer.email || '-'}</Text>
              </BlockStack>
            </IndexTable.Cell>
            <IndexTable.Cell><Text as="span" variant="bodyMd">{formatDate(quote.created_at)}</Text></IndexTable.Cell>
            <IndexTable.Cell><Text as="span" tone="subdued">-</Text></IndexTable.Cell>
            <IndexTable.Cell><Text as="span" tone="subdued">-</Text></IndexTable.Cell>
            <IndexTable.Cell><Badge tone={status.tone}>{status.label}</Badge></IndexTable.Cell>
            <IndexTable.Cell><Text as="span">{assignedStaff?.name || assignedStaff?.first_name ||'Unassigned'}</Text></IndexTable.Cell>
          </IndexTable.Row>
        );
      }
    );
  }, [paginatedQuotes, selectedResources, handleRowClick]);

  // loading 
  if (loading) return <LoadingState title="Quote List" accessibilityLabel="Loading quotes" />;
  if (error) return <ErrorState title="Quote List" message="Failed to load quotes." onRetry={fetchData} />;


  // MAIN UI
  return (
    <AppLayout>
      <Page title="Quote List">
        <Card padding="0">
          <div style={{borderBottom: '1px solid #e1e3e5',}}>
            <InlineStack gap="0" wrap={false}>
              {tabs.map((tab) => {
                const isActive =activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {setActiveTab(tab.id); setPage(1);}}
                    style={{ border: 'none', background: 'transparent', padding:'12px 16px', cursor: 'pointer', fontSize: '14px',fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#202223' : '#616161', borderBottom: isActive ? '2px solid #202223' : '2px solid transparent',}}
                  >
                    {tab.content}
                  </button>
                );
              })}
            </InlineStack>
          </div>

          <div style={{padding: 'var(--p-space-400)',paddingBottom:'var(--p-space-200)',}}>
            <Filters
              queryValue={searchValue}
              queryPlaceholder="Search quotes or customers"
              filters={filters}
              appliedFilters={appliedFilters}
              onQueryChange={handleSearchChange}
              onQueryClear={() =>handleSearchChange('')}
              onClearAll={handleClearAll}
            />
          </div>

          {filteredQuotes.length === 0 ? (
            <Box padding="600">
              <EmptySearchResult title="No quotes found" 
                description="Try changing your search or filters."
                withIllustration
              />
            </Box>
          ) : (
            <>
              <IndexTable
                resourceName={{singular: 'quote', plural: 'quotes',}}
                itemCount={paginatedQuotes.length}
                selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                onSelectionChange={handleSelectionChange}
                headings={[
                  {
                    title: 'Quote ID',
                  },
                  {
                    title:
                      'Customer Information',
                  },
                  {
                    title:
                      'Created Time',
                  },
                  {
                    title:
                      'Lead Score',
                  },
                  {
                    title:
                      'Progress Logs',
                  },
                  {
                    title:
                      'Quote Status',
                  },
                  {
                    title:
                      'Assignee',
                  },
                ]}
              >
                {rowMarkup}
              </IndexTable>

              <Box padding="400">
                <InlineStack align="center" blockAlign="center">
                  <Pagination hasPrevious={ safePage > 1}
                    onPrevious={() =>setPage((current) =>Math.max(1, current - 1))}
                    hasNext={safePage < totalPages}
                    onNext={() =>setPage((current) =>Math.min(totalPages,current + 1))
                    }
                    label={`Page ${safePage} of ${totalPages}`}
                  />
                </InlineStack>
              </Box>
            </>
          )}
        </Card>
      </Page>
    </AppLayout>
  );
}