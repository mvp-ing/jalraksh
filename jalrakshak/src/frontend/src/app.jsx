// SPDX-License-Identifier: MIT
// Copyright Jalraksh

import React, { useCallback, useEffect, useRef, useState } from 'react';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import styled, { ThemeProvider, StyleSheetManager } from 'styled-components';
import Window from 'global/window';
import { connect, useDispatch } from 'react-redux';

import isEqual from 'lodash/isEqual';
import { useSelector } from 'react-redux';
import isPropValid from '@emotion/is-prop-valid';
import { WebMercatorViewport } from '@deck.gl/core';
import { ScreenshotWrapper } from '@openassistant/ui';
import {
  setStartScreenCapture,
  setScreenCaptured,
  AiAssistantPanel,
  setMapBoundary,
  updateAiAssistantConfig,
} from '@jalrakshak/ai-assistant';
import { panelBorderColor, theme } from '@jalrakshak/styles';
import { getApplicationConfig } from '@jalrakshak/utils';
import { SqlPanel } from '@jalrakshak/duckdb/components';

import { replaceLoadDataModal } from './factories/load-data-modal';
import { replaceMapControl } from './factories/map-control';
import { replacePanelHeader } from './factories/panel-header';
import {
  CLOUD_PROVIDERS_CONFIGURATION,
  DEFAULT_FEATURE_FLAGS,
} from './constants/default-settings';
import { messages } from './constants/localization';

import {
  loadRemoteMap,
  onExportFileSuccess,
  onLoadCloudMapSuccess,
} from './actions';

import {
  loadCloudMap,
  toggleMapControl,
  toggleModal,
  updateMap,
  addDataToMap,
  setFilter,
  addFilter,
  setFilterAnimationWindow,
  setFilterAnimationTime,
} from '@jalrakshak/actions';
import { CLOUD_PROVIDERS } from './cloud-providers';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

// Import sample data for pollution monitoring demo
import { loadAllSampleData, getTimeseriesTimeRange } from './data/sample-data';

// Import share URL utilities for parsing incoming share links
import { parseShareableLink, clearShareParams, isShareUrl, SEGMENT_COORDINATES } from './utils/share-url';

const Jalrakshak = require('@jalrakshak/components').injectComponents([
  replaceLoadDataModal(),
  replaceMapControl(),
  replacePanelHeader(),
]);

// Sample data
/* eslint-disable no-unused-vars */

/* eslint-enable no-unused-vars */

// This implements the default behavior from styled-components v5
function shouldForwardProp(propName, target) {
  if (typeof target === 'string') {
    // For HTML elements, forward the prop if it is a valid HTML attribute
    return isPropValid(propName);
  }
  // For other elements, forward all props
  return true;
}

const jalrakshakGlGetState = (state) => state.demo.jalrakshakGl;

const GlobalStyle = styled.div`
  font-family: ff-clan-web-pro, 'Helvetica Neue', Helvetica, sans-serif;
  font-weight: 400;
  font-size: 0.875em;
  line-height: 1.71429;

  *,
  *:before,
  *:after {
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
  }

  ul {
    margin: 0;
    padding: 0;
  }

  li {
    margin: 0;
  }

  a {
    text-decoration: none;
    color: ${(props) => props.theme.labelColor};
  }
`;

const CONTAINER_STYLE = {
  transition: 'margin 1s, height 1s',
  position: 'absolute',
  width: '100%',
  height: '100%',
  left: 0,
  top: 0,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#333',
};

const StyledResizeHandle = styled(PanelResizeHandle)`
  background-color: ${panelBorderColor};
  &:hover {
    background-color: #555;
  }
  width: 100%;
  height: 5px;
  cursor: row-resize;
`;

const StyledVerticalResizeHandle = styled(PanelResizeHandle)`
  background-color: ${panelBorderColor};
  width: 4px;
  height: 100%;
  cursor: row-resize;

  &:hover {
    background-color: #555;
  }
`;

const App = (props) => {
  const { params: { id, provider } = {}, location: { query = {} } = {} } =
    props;
  const dispatch = useDispatch();

  // State for tracking if share data has been loaded
  const [shareDataLoaded, setShareDataLoaded] = useState(false);

  // TODO find another way to check for existence of duckDb plugin
  const duckDbPluginEnabled = (getApplicationConfig().plugins || []).some(
    (p) => p.name === 'duckdb'
  );

  const isSqlPanelOpen = useSelector(
    (state) =>
      duckDbPluginEnabled &&
      state?.demo?.jalrakshakGl?.map?.uiState.mapControls.sqlPanel?.active
  );

  const isAiAssistantPanelOpen = useSelector(
    (state) =>
      state?.demo?.jalrakshakGl?.map?.uiState.mapControls.aiAssistant?.active
  );

  const prevQueryRef = useRef(null);

  useEffect(() => {
    // if we pass an id as part of the url
    // we try to fetch along map configurations
    const cloudProvider = CLOUD_PROVIDERS.find((c) => c.name === provider);
    if (cloudProvider) {
      // Prevent constant reloading after change of the location
      if (isEqual(prevQueryRef.current, { provider, id, query })) {
        return;
      }

      dispatch(
        loadCloudMap({
          loadParams: query,
          provider: cloudProvider,
          onSuccess: onLoadCloudMapSuccess,
        })
      );
      prevQueryRef.current = { provider, id, query };
      return;
    }

    // Load map using a custom
    if (query.mapUrl) {
      // TODO?: validate map url
      dispatch(loadRemoteMap({ dataUrl: query.mapUrl }));
    }

    if (duckDbPluginEnabled && query.sql) {
      dispatch(toggleMapControl('sqlPanel', 0));
      dispatch(toggleModal(null));
    }

    // Check for share URL parameters and apply them
    const shareData = parseShareableLink();
    if (shareData && !shareDataLoaded) {
      console.log('📎 Loading shared visualization:', shareData);
      setShareDataLoaded(true);
      
      // Apply shared map state if available
      if (shareData.mapState) {
        dispatch(
          updateMap({
            latitude: shareData.mapState.latitude,
            longitude: shareData.mapState.longitude,
            zoom: shareData.mapState.zoom,
            pitch: shareData.mapState.pitch,
            bearing: shareData.mapState.bearing,
          })
        );
      } else if (shareData.seg && SEGMENT_COORDINATES[shareData.seg]) {
        // If only segment ID is provided, zoom to that segment
        const coords = SEGMENT_COORDINATES[shareData.seg];
        dispatch(
          updateMap({
            latitude: coords.lat,
            longitude: coords.lng,
            zoom: coords.zoom || 14,
            pitch: 45,
            bearing: 0,
          })
        );
      } else {
        // Default map view to Delhi (Yamuna River)
        dispatch(
          updateMap({
            latitude: 28.6139,
            longitude: 77.209,
            zoom: 11,
            pitch: 45,
            bearing: 0,
          })
        );
      }
      
      // Log information about the shared link
      if (shareData.seg) {
        console.log(`🎯 Focusing on segment: ${shareData.segmentName || shareData.seg}`);
      }
      if (shareData.ts) {
        console.log(`⏰ Timestamp from share: ${shareData.ts}`);
      }
      
      // Clear the share params from URL to make it cleaner
      // (optional - comment out if you want to preserve the URL)
      // clearShareParams();
    } else {
      // Set initial map view to Delhi (Yamuna River)
      dispatch(
        updateMap({
          latitude: 28.6139,
          longitude: 77.209,
          zoom: 11,
          pitch: 45,
          bearing: 0,
        })
      );
    }

    // Set the Google AI API key from environment variable
    console.log('🔑 Google AI API Key from env:', CLOUD_PROVIDERS_CONFIGURATION.GOOGLE_AI_API_KEY ? 'Found' : 'Not found');
    if (CLOUD_PROVIDERS_CONFIGURATION.GOOGLE_AI_API_KEY) {
      dispatch(
        updateAiAssistantConfig({
          isReady: true,
          provider: 'google',
          model: 'gemini-2.5-flash',
          apiKey: CLOUD_PROVIDERS_CONFIGURATION.GOOGLE_AI_API_KEY,
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
          temperature: 0.0,
          topP: 1.0,
        })
      );
      console.log('✅ AI Assistant configured with Google Gemini');
    } else {
      console.warn('⚠️ Google AI API key not found in environment. Add GoogleAIApiKey to .env file.');
    }

    // Load sample pollution monitoring demo data
    const loadDemoData = () => {
      try {
        const { datasets, config, options } = loadAllSampleData();
        const timeRange = getTimeseriesTimeRange();

        // Close the load data modal
        dispatch(toggleModal(null));

        // Add sample data to map with layer configuration
        dispatch(
          addDataToMap({
            datasets,
            config,
            options,
          })
        );

        // Programmatically set up time filter for animation
        // This is done via actions because kepler-config.json filter settings
        // don't always initialize the filter value correctly

        // Step 1: Add filter for the pollution_gradient dataset
        setTimeout(() => {
          dispatch(addFilter('pollution_segments'));

          // Step 2: Set filter name to 'timestamp' to make it a time filter
          setTimeout(() => {
            dispatch(setFilter(0, 'name', 'timestamp'));

            // Step 3: Set the animation time value with a SMALL INITIAL WINDOW
            // For animation to work, we need to start with a small time window
            // that will move/expand as the animation plays
            // Using 12 hours (43200000 ms) as initial window
            setTimeout(() => {
              const initialWindowSize = 12 * 60 * 60 * 1000; // 12 hours in ms
              const initialValue = [timeRange.min, timeRange.min + initialWindowSize];
              
              console.log("Setting initial animation window:", {
                start: new Date(initialValue[0]).toISOString(),
                end: new Date(initialValue[1]).toISOString()
              });
              
              dispatch(setFilterAnimationTime(0, 'value', initialValue));

              console.log(
                '✅ Jalrakshak: Pollution monitoring demo data loaded successfully'
              );
              console.log(
                '📊 Loaded layers: Pollution Gradient, Sensor Points, Attribution Arcs, Factory Markers'
              );
              console.log('⏱️ Time filter configured programmatically');
              console.log(
                `📅 Full time range: ${new Date(
                  timeRange.min
                ).toISOString()} to ${new Date(timeRange.max).toISOString()}`
              );
            }, 100);
          }, 100);
        }, 500);
      } catch (error) {
        console.error('❌ Jalrakshak: Error loading sample data:', error);
      }
    };

    // Load demo data after a short delay to ensure map is ready
    setTimeout(loadDemoData, 500);

    // no dependencies, as this was part of componentDidMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Update map boundary when view state changes, used by ai-assistant to
   * get data from vector tiles when map boundary changes
   */
  const onViewStateChange = useCallback(
    (viewState) => {
      const viewport = new WebMercatorViewport(viewState);
      const nw = viewport.unproject([0, 0]);
      const se = viewport.unproject([viewport.width, viewport.height]);
      dispatch(setMapBoundary(nw, se));
    },
    [dispatch]
  );

  const _setStartScreenCapture = useCallback(
    (flag) => {
      dispatch(setStartScreenCapture(flag));
    },
    [dispatch]
  );

  const _setScreenCaptured = useCallback(
    (screenshot) => {
      dispatch(setScreenCaptured(screenshot));
    },
    [dispatch]
  );

  /*
  const _showBanner = useCallback(() => {
    toggleShowBanner(true);
  }, [toggleShowBanner]);
  */

  return (
    <StyleSheetManager shouldForwardProp={shouldForwardProp}>
      <ThemeProvider theme={theme}>
        <GlobalStyle
        // this is to apply the same modal style as jalrakshak core
        // because styled-components doesn't always return a node
        // https://github.com/styled-components/styled-components/issues/617
        // ref={node => {
        //   node ? (this.root = node) : null;
        // }}
        >
          <ScreenshotWrapper
            startScreenCapture={
              props.demo.aiAssistant.screenshotToAsk.startScreenCapture
            }
            setScreenCaptured={_setScreenCaptured}
            setStartScreenCapture={_setStartScreenCapture}
            className='h-screen'
          >
            <div style={CONTAINER_STYLE}>
              <PanelGroup direction='horizontal'>
                <Panel defaultSize={isAiAssistantPanelOpen ? 70 : 100}>
                  <PanelGroup direction='vertical'>
                    <Panel defaultSize={isSqlPanelOpen ? 60 : 100}>
                      <AutoSizer>
                        {({ height, width }) => (
                          <Jalrakshak
                            mapboxApiAccessToken={
                              CLOUD_PROVIDERS_CONFIGURATION.MAPBOX_TOKEN
                            }
                            id='map'
                            getState={jalrakshakGlGetState}
                            width={width}
                            height={height}
                            cloudProviders={CLOUD_PROVIDERS}
                            localeMessages={messages}
                            onExportToCloudSuccess={onExportFileSuccess}
                            onLoadCloudMapSuccess={onLoadCloudMapSuccess}
                            featureFlags={DEFAULT_FEATURE_FLAGS}
                            onViewStateChange={onViewStateChange}
                          />
                        )}
                      </AutoSizer>
                    </Panel>

                    {isSqlPanelOpen && (
                      <>
                        <StyledResizeHandle />
                        <Panel defaultSize={40} minSize={20}>
                          <SqlPanel initialSql={query.sql || ''} />
                        </Panel>
                      </>
                    )}
                  </PanelGroup>
                </Panel>
                {isAiAssistantPanelOpen && (
                  <>
                    <StyledVerticalResizeHandle />
                    <Panel defaultSize={30} minSize={20}>
                      <AiAssistantPanel />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </div>
          </ScreenshotWrapper>
        </GlobalStyle>
      </ThemeProvider>
    </StyleSheetManager>
  );
};

const mapStateToProps = (state) => state;
const dispatchToProps = (dispatch) => ({ dispatch });

export default connect(mapStateToProps, dispatchToProps)(App);
