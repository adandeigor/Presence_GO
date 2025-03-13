import { Html, Head, Body, Container, Heading, Text, Button, Section } from "@react-email/components";

export default function MagicLinkEmail({ url }: { url: string }) {
  return (
    <Html>
      <Head />
      <Body className="bg-gray-100 p-6 font-sans">
        <Container className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md mx-auto">
          <Heading as="h2" className="text-2xl font-bold text-blue-600">
            Connexion à PrésenceGo
          </Heading>
          <Text className="text-gray-700 text-base mt-4">
            Cliquez sur le bouton ci-dessous pour vous connecter à votre compte PrésenceGo :
          </Text>
          <Section className="mt-6">
            <Button 
              href={url} 
              className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-md shadow-md hover:bg-blue-700"
            >
              Se connecter
            </Button>
          </Section>
          <Text className="text-xs text-gray-500 mt-6">
            Si vous n'avez pas demandé cet email, ignorez-le.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}