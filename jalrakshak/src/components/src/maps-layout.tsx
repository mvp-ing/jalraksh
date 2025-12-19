// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import styled from 'styled-components';
import React from 'react';

import { MapState } from '@jalrakshak/types';

import { MapViewStateContextProvider } from './map-view-state-context';

const Outer = styled.div`
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
`;

MapsLayoutFactory.deps = [];

interface MapsLayoutProps {
  mapState: MapState;
  className?: string;
  children?: React.ReactNode;
}

export default function MapsLayoutFactory(): React.ComponentType<MapsLayoutProps> {
  class MapsLayout extends React.Component<MapsLayoutProps> {
    render() {
      return (
        <Outer className={this.props.className}>
          <MapViewStateContextProvider mapState={this.props.mapState}>
            {this.props.children}
          </MapViewStateContextProvider>
        </Outer>
      );
    }
  }
  return MapsLayout;
}
