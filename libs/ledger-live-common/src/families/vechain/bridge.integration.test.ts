import "../../__tests__/test-helpers/setup";
import { testBridge } from "../../__tests__/test-helpers/bridge";
import dataset from "@ledgerhq/coin-vechain/test/index";

testBridge(dataset); // TODO: Remove casting
