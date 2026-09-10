import { useCallback, useMemo } from "react";
import type { LayerKey, LayerVisibility, SpatialObject, VisualizationSettings } from "../types/visualization.types";

/**
 * Resolves which objects are drawn, combining the layer panel with the
 * visualization settings that also hide things (trees, road network,
 * terrain). Both renderers call `isVisible` so 2-D and 3-D always agree.
 */
export function useLayerVisibility(layers: LayerVisibility, settings: VisualizationSettings) {
  const effective = useMemo<LayerVisibility>(
    () => ({
      ...layers,
      buildings: layers.buildings && settings.buildings,
      trees: layers.trees && settings.trees && settings.landscape,
      green: layers.green && settings.landscape,
      parks: layers.parks && settings.landscape,
      water: layers.water && settings.water,
      roads: layers.roads && settings.roadNetwork,
      terrain: layers.terrain && settings.terrain,
    }),
    [layers, settings.buildings, settings.trees, settings.landscape, settings.water, settings.roadNetwork, settings.terrain]
  );

  const isLayerVisible = useCallback((key: LayerKey) => effective[key], [effective]);
  const isVisible = useCallback((o: SpatialObject) => o.visible && effective[o.layer], [effective]);
  const filter = useCallback((objects: SpatialObject[]) => objects.filter((o) => o.visible && effective[o.layer]), [effective]);

  return { effective, isLayerVisible, isVisible, filter };
}
