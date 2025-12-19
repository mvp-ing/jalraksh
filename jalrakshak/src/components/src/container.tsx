// SPDX-License-Identifier: MIT
// Copyright Jalraksh



import React, { useRef, ComponentType, Dispatch, useEffect, useMemo } from 'react';
import { connect, ConnectedProps, useDispatch } from 'react-redux';

import { console as Console } from 'global/window';
import { injector, provideRecipesToInjector, flattenDeps } from './injector';
import JalrakshakFactory from './jalrakshak-gl';
import { registerEntry, deleteEntry, renameEntry, forwardTo } from '@jalrakshak/actions';
import { JalrakshakState } from '@jalrakshak/reducers';
import { getApplicationConfig } from '@jalrakshak/utils';

export const ERROR_MSG = {
  noState:
    `jalrakshak state does not exist. ` +
    `You might forget to mount jalrakshakGlReducer in your root reducer.` +
    `If it is not mounted as state.jalrakshakGl by default, you need to provide getState as a prop`
};

const mapStateToProps = (state: any, props: ContainerProps) => ({ state, ...props });
const dispatchToProps = (dispatch: Dispatch<any>) => ({ dispatch });
const connector = connect(mapStateToProps, dispatchToProps);

type ContainerProps = {
  id: string;
  mapboxApiAccessToken: string;
  mapboxApiUrl?: string;
  mapStylesReplaceDefault?: boolean;
  initialUiState?: object;
  width: number;
  mint?: boolean;
  getState: (state: any) => JalrakshakState;
};

type PropsFromRedux = ConnectedProps<typeof connector> & ContainerProps;

ContainerFactory.deps = [JalrakshakFactory];

export function ContainerFactory(
  Jalrakshak: ReturnType<typeof JalrakshakFactory>
): ComponentType<PropsFromRedux> {
  /** @lends Jalrakshak */
  /**
    * Main Jalrakshak.gl Component
    * @param {Object} props
    *
    * @param {string} props.id - _required_
    *
    * - Default: `map`
    * The id of this Jalrakshak instance. `id` is required if you have multiple
    * Jalrakshak instances in your app. It defines the prop name of the Jalrakshak state that is
    * stored in the Jalrakshak reducer. For example, the state of the Jalrakshak component with id `foo` is
    * stored in `state.jalrakshakGl.foo`.
    *
    * In case you create multiple jalrakshak instances using the same id, the jalrakshak state defined by the entry will be
    * overridden by the latest instance and reset to a blank state.
    * @param {string} props.mapboxApiAccessToken - _required_
    * @param {string} props.mapboxApiUrl - _optional_
    * @param {Boolean} props.mapStylesReplaceDefault - _optional_
    * @param {object} props.initialUiState - _optional_

    * You can create a free account at [www.mapbox.com](www.mapbox.com) and create a token at
    * [www.mapbox.com/account/access-tokens](www.mapbox.com/account/access-tokens)
    *
    *
    * @param {Number} props.width - _required_ Width of the Jalrakshak UI.
    * @public
   */

  function usePreviousId(value) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  }

  const Container: React.FC<PropsFromRedux> = props => {
    const {
      // default id and address if not provided
      id = 'map',
      getState = state => state.jalrakshakGl,
      mint = true,
      mapboxApiAccessToken,
      mapboxApiUrl,
      mapStylesReplaceDefault,
      initialUiState,
      state
    } = props;
    const prevId = usePreviousId(id);
    const dispatch = useDispatch();

    useEffect(() => {
      // add a new entry to reducer
      dispatch(
        registerEntry({
          id,
          mint,
          mapboxApiAccessToken,
          mapboxApiUrl,
          mapStylesReplaceDefault,
          initialUiState
        })
      );

      // initialize plugins
      if (getApplicationConfig().plugins.length) {
        getApplicationConfig().plugins.forEach(async plugin => {
          await plugin.init();
        });
      }

      // cleanup
      return () => {
        if (mint !== false) {
          // delete entry in reducer
          dispatch(deleteEntry(id));
        }
      };
    }, [
      id,
      dispatch,
      initialUiState,
      mapStylesReplaceDefault,
      mapboxApiAccessToken,
      mapboxApiUrl,
      mint
    ]);

    useEffect(() => {
      // check if id has changed, if true, copy state over
      if (prevId && id && prevId !== id) {
        dispatch(renameEntry(prevId, id));
      }
    }, [dispatch, prevId, id]);

    const stateSelector = useMemo(
      () => jalrakshakState => {
        if (!getState(jalrakshakState)) {
          // log error
          Console.error(ERROR_MSG.noState);

          return null;
        }
        return getState(jalrakshakState)[id];
      },
      [id, getState]
    );
    const forwardDispatch = useMemo(() => forwardTo(id, dispatch), [id, dispatch]);

    // const selector = getSelector(id, getState);

    if (!stateSelector || !stateSelector(state)) {
      // instance state hasn't been mounted yet
      return <div />;
    }

    return <Jalrakshak {...props} id={id} selector={stateSelector} dispatch={forwardDispatch} />;
  };

  return connector(Container);
}

const allDependencies = flattenDeps([], ContainerFactory);

// provide all dependencies to appInjector
export const appInjector = allDependencies.reduce(
  (inj, factory) => inj.provide(factory, factory),
  injector()
);

// Helper to inject custom components and return jalrakshak container
export function injectComponents(recipes = []) {
  return provideRecipesToInjector(recipes, appInjector).get(ContainerFactory);
}

const InjectedContainer = appInjector.get(ContainerFactory);

export default InjectedContainer;
