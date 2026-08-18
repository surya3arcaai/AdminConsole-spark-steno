"use server";
import { DefaultAzureCredential } from "@azure/identity";
import { ContainerInstanceManagementClient } from "@azure/arm-containerinstance";

export async function fetchContainerLogsAction(containerGroupName) {
    try {
        const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
        const resourceGroupName = "emr-lite";

        if (!subscriptionId) {
            return `Configuration Error: The dashboard Server lacks an Azure Subscription ID.\n\nPlease add the following to your .env:\nAZURE_SUBSCRIPTION_ID="your_subscription_id_here"\n(And ensure you have run 'az login' locally to authenticate)`;
        }

        // DefaultAzureCredential automatically falls back to your local 'az login' CLI session 
        // if AZURE_CLIENT_ID and AZURE_CLIENT_SECRET are not provided!
        const credential = new DefaultAzureCredential();
        const client = new ContainerInstanceManagementClient(credential, subscriptionId);

        // Fetch the full historical logs using the Azure REST API headlessly.
        // Note: The container name inside an Azure Container Group usually defaults to the Group Name if deployed simply.
        const response = await client.containers.listLogs(resourceGroupName, containerGroupName, containerGroupName);

        return response.content || "No log output available yet.";
    } catch (error) {
        // Return structured, clean UI messages rather than leaking raw Node errors if auth fails.
        return `Failed to securely fetch Azure logs using Service Principal Object API.\nTarget: ${containerGroupName}\n\nError Details:\n${error.message}`;
    }
}
