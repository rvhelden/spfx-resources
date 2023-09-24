import { z } from "zod";

export default z.object({
  localizedResources: z.record(z.string(), z.string()),
});
