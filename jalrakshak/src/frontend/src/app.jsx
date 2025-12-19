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
  setMapBoundary
} from '@jalrakshak/ai-assistant';
import { panelBorderColor, theme } from '@jalrakshak/styles';
import { getApplicationConfig } from '@jalrakshak/utils';
import { SqlPanel } from '@jalrakshak/duckdb/components';

import { replaceLoadDataModal } from './factories/load-data-modal';
import { replaceMapControl } from './factories/map-control';
import { replacePanelHeader } from './factories/panel-header';
import { CLOUD_PROVIDERS_CONFIGURATION, DEFAULT_FEATURE_FLAGS } from './constants/default-settings';
import { messages } from './constants/localization';

import {
  loadRemoteMap,
  onExportFileSuccess,
  onLoadCloudMapSuccess
} from './actions';

import {
  loadCloudMap,
  toggleMapControl,
  toggleModal
} from '@jalrakshak/actions';
import { CLOUD_PROVIDERS } from './cloud-providers';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const Jalrakshak = require('@jalrakshak/components').injectComponents([
  replaceLoadDataModal(),
  replaceMapControl(),
  replacePanelHeader()
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


const jalrakshakGlGetState = state => state.demo.jalrakshakGl;

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
    color: ${props => props.theme.labelColor};
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
  backgroundColor: '#333'
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

const App = props => {

  const { params: { id, provider } = {}, location: { query = {} } = {} } = props;
  const dispatch = useDispatch();

  // TODO find another way to check for existence of duckDb plugin
  const duckDbPluginEnabled = (getApplicationConfig().plugins || []).some(p => p.name === 'duckdb');

  const isSqlPanelOpen = useSelector(
    state => duckDbPluginEnabled && state?.demo?.jalrakshakGl?.map?.uiState.mapControls.sqlPanel?.active
  );

  const isAiAssistantPanelOpen = useSelector(
    state => state?.demo?.jalrakshakGl?.map?.uiState.mapControls.aiAssistant?.active
  );

  const prevQueryRef = useRef(null);

  useEffect(() => {
    // if we pass an id as part of the url
    // we try to fetch along map configurations
    const cloudProvider = CLOUD_PROVIDERS.find(c => c.name === provider);
    if (cloudProvider) {
      // Prevent constant reloading after change of the location
      if (isEqual(prevQueryRef.current, { provider, id, query })) {
        return;
      }

      dispatch(
        loadCloudMap({
          loadParams: query,
          provider: cloudProvider,
          onSuccess: onLoadCloudMapSuccess
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

    // delay zs to show the banner
    // if (!window.localStorage.getItem(BannerKey)) {
    //   window.setTimeout(_showBanner, 3000);
    // }
    // load sample data
    // _loadSampleData();

    // Notifications

    // no dependencies, as this was part of componentDidMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Update map boundary when view state changes, used by ai-assistant to
   * get data from vector tiles when map boundary changes
   */
  const onViewStateChange = useCallback(
    viewState => {
      const viewport = new WebMercatorViewport(viewState);
      const nw = viewport.unproject([0, 0]);
      const se = viewport.unproject([viewport.width, viewport.height]);
      dispatch(setMapBoundary(nw, se));
    },
    [dispatch]
  );

  const _setStartScreenCapture = useCallback(
    flag => {
      dispatch(setStartScreenCapture(flag));
    },
    [dispatch]
  );

  const _setScreenCaptured = useCallback(
    screenshot => {
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
            startScreenCapture={props.demo.aiAssistant.screenshotToAsk.startScreenCapture}
            setScreenCaptured={_setScreenCaptured}
            setStartScreenCapture={_setStartScreenCapture}
            className="h-screen"
          >

            <div style={CONTAINER_STYLE}>
              <PanelGroup direction="horizontal">
                <Panel defaultSize={isAiAssistantPanelOpen ? 70 : 100}>
                  <PanelGroup direction="vertical">
                    <Panel defaultSize={isSqlPanelOpen ? 60 : 100}>
                      <AutoSizer>
                        {({ height, width }) => (
                          <Jalrakshak
                            mapboxApiAccessToken={CLOUD_PROVIDERS_CONFIGURATION.MAPBOX_TOKEN}
                            id="map"
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

const mapStateToProps = state => state;
const dispatchToProps = dispatch => ({ dispatch });

export default connect(mapStateToProps, dispatchToProps)(App);
